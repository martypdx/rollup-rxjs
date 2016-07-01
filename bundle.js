(function () {
  'use strict';

  let objectTypes = {
      'boolean': false,
      'function': true,
      'object': true,
      'number': false,
      'string': false,
      'undefined': false
  };
  let root = (objectTypes[typeof self] && self) || (objectTypes[typeof window] && window);
  /* tslint:disable:no-unused-variable */
  let freeExports = objectTypes[typeof exports] && exports && !exports.nodeType && exports;
  let freeModule = objectTypes[typeof module] && module && !module.nodeType && module;
  let freeGlobal = objectTypes[typeof global] && global;
  if (freeGlobal && (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal)) {
      root = freeGlobal;
  }

  function isFunction(x) {
      return typeof x === 'function';
  }

  const isArray = Array.isArray || ((x) => x && typeof x.length === 'number');

  function isObject(x) {
      return x != null && typeof x === 'object';
  }

  // typeof any so that it we don't have to cast when comparing a result to the error object
  var errorObject = { e: {} };

  let tryCatchTarget;
  function tryCatcher() {
      try {
          return tryCatchTarget.apply(this, arguments);
      }
      catch (e) {
          errorObject.e = e;
          return errorObject;
      }
  }
  function tryCatch(fn) {
      tryCatchTarget = fn;
      return tryCatcher;
  }
  ;

  /**
   * An error thrown when one or more errors have occurred during the
   * `unsubscribe` of a {@link Subscription}.
   */
  class UnsubscriptionError extends Error {
      constructor(errors) {
          super();
          this.errors = errors;
          this.name = 'UnsubscriptionError';
          this.message = errors ? `${errors.length} errors occurred during unsubscription:
${errors.map((err, i) => `${i + 1}) ${err.toString()}`).join('\n')}` : '';
      }
  }

  /**
   * Represents a disposable resource, such as the execution of an Observable. A
   * Subscription has one important method, `unsubscribe`, that takes no argument
   * and just disposes the resource held by the subscription.
   *
   * Additionally, subscriptions may be grouped together through the `add()`
   * method, which will attach a child Subscription to the current Subscription.
   * When a Subscription is unsubscribed, all its children (and its grandchildren)
   * will be unsubscribed as well.
   *
   * @class Subscription
   */
  class Subscription {
      /**
       * @param {function(): void} [unsubscribe] A function describing how to
       * perform the disposal of resources when the `unsubscribe` method is called.
       */
      constructor(unsubscribe) {
          /**
           * A flag to indicate whether this Subscription has already been unsubscribed.
           * @type {boolean}
           */
          this.isUnsubscribed = false;
          if (unsubscribe) {
              this._unsubscribe = unsubscribe;
          }
      }
      /**
       * Disposes the resources held by the subscription. May, for instance, cancel
       * an ongoing Observable execution or cancel any other type of work that
       * started when the Subscription was created.
       * @return {void}
       */
      unsubscribe() {
          let hasErrors = false;
          let errors;
          if (this.isUnsubscribed) {
              return;
          }
          this.isUnsubscribed = true;
          const { _unsubscribe, _subscriptions } = this;
          this._subscriptions = null;
          if (isFunction(_unsubscribe)) {
              let trial = tryCatch(_unsubscribe).call(this);
              if (trial === errorObject) {
                  hasErrors = true;
                  (errors = errors || []).push(errorObject.e);
              }
          }
          if (isArray(_subscriptions)) {
              let index = -1;
              const len = _subscriptions.length;
              while (++index < len) {
                  const sub = _subscriptions[index];
                  if (isObject(sub)) {
                      let trial = tryCatch(sub.unsubscribe).call(sub);
                      if (trial === errorObject) {
                          hasErrors = true;
                          errors = errors || [];
                          let err = errorObject.e;
                          if (err instanceof UnsubscriptionError) {
                              errors = errors.concat(err.errors);
                          }
                          else {
                              errors.push(err);
                          }
                      }
                  }
              }
          }
          if (hasErrors) {
              throw new UnsubscriptionError(errors);
          }
      }
      /**
       * Adds a tear down to be called during the unsubscribe() of this
       * Subscription.
       *
       * If the tear down being added is a subscription that is already
       * unsubscribed, is the same reference `add` is being called on, or is
       * `Subscription.EMPTY`, it will not be added.
       *
       * If this subscription is already in an `isUnsubscribed` state, the passed
       * tear down logic will be executed immediately.
       *
       * @param {TeardownLogic} teardown The additional logic to execute on
       * teardown.
       * @return {Subscription} Returns the Subscription used or created to be
       * added to the inner subscriptions list. This Subscription can be used with
       * `remove()` to remove the passed teardown logic from the inner subscriptions
       * list.
       */
      add(teardown) {
          if (!teardown || (teardown === this) || (teardown === Subscription.EMPTY)) {
              return;
          }
          let sub = teardown;
          switch (typeof teardown) {
              case 'function':
                  sub = new Subscription(teardown);
              case 'object':
                  if (sub.isUnsubscribed || typeof sub.unsubscribe !== 'function') {
                      break;
                  }
                  else if (this.isUnsubscribed) {
                      sub.unsubscribe();
                  }
                  else {
                      (this._subscriptions || (this._subscriptions = [])).push(sub);
                  }
                  break;
              default:
                  throw new Error('Unrecognized teardown ' + teardown + ' added to Subscription.');
          }
          return sub;
      }
      /**
       * Removes a Subscription from the internal list of subscriptions that will
       * unsubscribe during the unsubscribe process of this Subscription.
       * @param {Subscription} subscription The subscription to remove.
       * @return {void}
       */
      remove(subscription) {
          // HACK: This might be redundant because of the logic in `add()`
          if (subscription == null || (subscription === this) || (subscription === Subscription.EMPTY)) {
              return;
          }
          const subscriptions = this._subscriptions;
          if (subscriptions) {
              const subscriptionIndex = subscriptions.indexOf(subscription);
              if (subscriptionIndex !== -1) {
                  subscriptions.splice(subscriptionIndex, 1);
              }
          }
      }
  }
  Subscription.EMPTY = (function (empty) {
      empty.isUnsubscribed = true;
      return empty;
  }(new Subscription()));

  const empty = {
      isUnsubscribed: true,
      next(value) { },
      error(err) { throw err; },
      complete() { }
  };

  const Symbol = root.Symbol;
  const $$rxSubscriber = (typeof Symbol === 'function' && typeof Symbol.for === 'function') ?
      Symbol.for('rxSubscriber') : '@@rxSubscriber';

  /**
   * Implements the {@link Observer} interface and extends the
   * {@link Subscription} class. While the {@link Observer} is the public API for
   * consuming the values of an {@link Observable}, all Observers get converted to
   * a Subscriber, in order to provide Subscription-like capabilities such as
   * `unsubscribe`. Subscriber is a common type in RxJS, and crucial for
   * implementing operators, but it is rarely used as a public API.
   *
   * @class Subscriber<T>
   */
  class Subscriber extends Subscription {
      /**
       * @param {Observer|function(value: T): void} [destinationOrNext] A partially
       * defined Observer or a `next` callback function.
       * @param {function(e: ?any): void} [error] The `error` callback of an
       * Observer.
       * @param {function(): void} [complete] The `complete` callback of an
       * Observer.
       */
      constructor(destinationOrNext, error, complete) {
          super();
          this.syncErrorValue = null;
          this.syncErrorThrown = false;
          this.syncErrorThrowable = false;
          this.isStopped = false;
          switch (arguments.length) {
              case 0:
                  this.destination = empty;
                  break;
              case 1:
                  if (!destinationOrNext) {
                      this.destination = empty;
                      break;
                  }
                  if (typeof destinationOrNext === 'object') {
                      if (destinationOrNext instanceof Subscriber) {
                          this.destination = destinationOrNext;
                          this.destination.add(this);
                      }
                      else {
                          this.syncErrorThrowable = true;
                          this.destination = new SafeSubscriber(this, destinationOrNext);
                      }
                      break;
                  }
              default:
                  this.syncErrorThrowable = true;
                  this.destination = new SafeSubscriber(this, destinationOrNext, error, complete);
                  break;
          }
      }
      [$$rxSubscriber]() { return this; }
      /**
       * A static factory for a Subscriber, given a (potentially partial) definition
       * of an Observer.
       * @param {function(x: ?T): void} [next] The `next` callback of an Observer.
       * @param {function(e: ?any): void} [error] The `error` callback of an
       * Observer.
       * @param {function(): void} [complete] The `complete` callback of an
       * Observer.
       * @return {Subscriber<T>} A Subscriber wrapping the (partially defined)
       * Observer represented by the given arguments.
       */
      static create(next, error, complete) {
          const subscriber = new Subscriber(next, error, complete);
          subscriber.syncErrorThrowable = false;
          return subscriber;
      }
      /**
       * The {@link Observer} callback to receive notifications of type `next` from
       * the Observable, with a value. The Observable may call this method 0 or more
       * times.
       * @param {T} [value] The `next` value.
       * @return {void}
       */
      next(value) {
          if (!this.isStopped) {
              this._next(value);
          }
      }
      /**
       * The {@link Observer} callback to receive notifications of type `error` from
       * the Observable, with an attached {@link Error}. Notifies the Observer that
       * the Observable has experienced an error condition.
       * @param {any} [err] The `error` exception.
       * @return {void}
       */
      error(err) {
          if (!this.isStopped) {
              this.isStopped = true;
              this._error(err);
          }
      }
      /**
       * The {@link Observer} callback to receive a valueless notification of type
       * `complete` from the Observable. Notifies the Observer that the Observable
       * has finished sending push-based notifications.
       * @return {void}
       */
      complete() {
          if (!this.isStopped) {
              this.isStopped = true;
              this._complete();
          }
      }
      unsubscribe() {
          if (this.isUnsubscribed) {
              return;
          }
          this.isStopped = true;
          super.unsubscribe();
      }
      _next(value) {
          this.destination.next(value);
      }
      _error(err) {
          this.destination.error(err);
          this.unsubscribe();
      }
      _complete() {
          this.destination.complete();
          this.unsubscribe();
      }
  }
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  class SafeSubscriber extends Subscriber {
      constructor(_parent, observerOrNext, error, complete) {
          super();
          this._parent = _parent;
          let next;
          let context = this;
          if (isFunction(observerOrNext)) {
              next = observerOrNext;
          }
          else if (observerOrNext) {
              context = observerOrNext;
              next = observerOrNext.next;
              error = observerOrNext.error;
              complete = observerOrNext.complete;
              if (isFunction(context.unsubscribe)) {
                  this.add(context.unsubscribe.bind(context));
              }
              context.unsubscribe = this.unsubscribe.bind(this);
          }
          this._context = context;
          this._next = next;
          this._error = error;
          this._complete = complete;
      }
      next(value) {
          if (!this.isStopped && this._next) {
              const { _parent } = this;
              if (!_parent.syncErrorThrowable) {
                  this.__tryOrUnsub(this._next, value);
              }
              else if (this.__tryOrSetError(_parent, this._next, value)) {
                  this.unsubscribe();
              }
          }
      }
      error(err) {
          if (!this.isStopped) {
              const { _parent } = this;
              if (this._error) {
                  if (!_parent.syncErrorThrowable) {
                      this.__tryOrUnsub(this._error, err);
                      this.unsubscribe();
                  }
                  else {
                      this.__tryOrSetError(_parent, this._error, err);
                      this.unsubscribe();
                  }
              }
              else if (!_parent.syncErrorThrowable) {
                  this.unsubscribe();
                  throw err;
              }
              else {
                  _parent.syncErrorValue = err;
                  _parent.syncErrorThrown = true;
                  this.unsubscribe();
              }
          }
      }
      complete() {
          if (!this.isStopped) {
              const { _parent } = this;
              if (this._complete) {
                  if (!_parent.syncErrorThrowable) {
                      this.__tryOrUnsub(this._complete);
                      this.unsubscribe();
                  }
                  else {
                      this.__tryOrSetError(_parent, this._complete);
                      this.unsubscribe();
                  }
              }
              else {
                  this.unsubscribe();
              }
          }
      }
      __tryOrUnsub(fn, value) {
          try {
              fn.call(this._context, value);
          }
          catch (err) {
              this.unsubscribe();
              throw err;
          }
      }
      __tryOrSetError(parent, fn, value) {
          try {
              fn.call(this._context, value);
          }
          catch (err) {
              parent.syncErrorValue = err;
              parent.syncErrorThrown = true;
              return true;
          }
          return false;
      }
      _unsubscribe() {
          const { _parent } = this;
          this._context = null;
          this._parent = null;
          _parent.unsubscribe();
      }
  }

  function toSubscriber(nextOrObserver, error, complete) {
      if (nextOrObserver) {
          if (nextOrObserver instanceof Subscriber) {
              return nextOrObserver;
          }
          if (nextOrObserver[$$rxSubscriber]) {
              return nextOrObserver[$$rxSubscriber]();
          }
      }
      if (!nextOrObserver && !error && !complete) {
          return new Subscriber();
      }
      return new Subscriber(nextOrObserver, error, complete);
  }

  function symbolObservablePonyfill(root) {
  	var result;
  	var Symbol = root.Symbol;

  	if (typeof Symbol === 'function') {
  		if (Symbol.observable) {
  			result = Symbol.observable;
  		} else {
  			result = Symbol('observable');
  			Symbol.observable = result;
  		}
  	} else {
  		result = '@@observable';
  	}

  	return result;
  };

  var root$1 = undefined;
  if (typeof global !== 'undefined') {
  	root$1 = global;
  } else if (typeof window !== 'undefined') {
  	root$1 = window;
  }

  var result = symbolObservablePonyfill(root$1);


  var $$observable = Object.freeze({
  	default: result
  });

  /**
   * A representation of any set of values over any amount of time. This the most basic building block
   * of RxJS.
   *
   * @class Observable<T>
   */
  class Observable {
      /**
       * @constructor
       * @param {Function} subscribe the function that is  called when the Observable is
       * initially subscribed to. This function is given a Subscriber, to which new values
       * can be `next`ed, or an `error` method can be called to raise an error, or
       * `complete` can be called to notify of a successful completion.
       */
      constructor(subscribe) {
          this._isScalar = false;
          if (subscribe) {
              this._subscribe = subscribe;
          }
      }
      /**
       * Creates a new Observable, with this Observable as the source, and the passed
       * operator defined as the new observable's operator.
       * @method lift
       * @param {Operator} operator the operator defining the operation to take on the observable
       * @return {Observable} a new observable with the Operator applied
       */
      lift(operator) {
          const observable = new Observable();
          observable.source = this;
          observable.operator = operator;
          return observable;
      }
      /**
       * Registers handlers for handling emitted values, error and completions from the observable, and
       *  executes the observable's subscriber function, which will take action to set up the underlying data stream
       * @method subscribe
       * @param {PartialObserver|Function} observerOrNext (optional) either an observer defining all functions to be called,
       *  or the first of three possible handlers, which is the handler for each value emitted from the observable.
       * @param {Function} error (optional) a handler for a terminal event resulting from an error. If no error handler is provided,
       *  the error will be thrown as unhandled
       * @param {Function} complete (optional) a handler for a terminal event resulting from successful completion.
       * @return {ISubscription} a subscription reference to the registered handlers
       */
      subscribe(observerOrNext, error, complete) {
          const { operator } = this;
          const sink = toSubscriber(observerOrNext, error, complete);
          if (operator) {
              operator.call(sink, this);
          }
          else {
              sink.add(this._subscribe(sink));
          }
          if (sink.syncErrorThrowable) {
              sink.syncErrorThrowable = false;
              if (sink.syncErrorThrown) {
                  throw sink.syncErrorValue;
              }
          }
          return sink;
      }
      /**
       * @method forEach
       * @param {Function} next a handler for each value emitted by the observable
       * @param {PromiseConstructor} [PromiseCtor] a constructor function used to instantiate the Promise
       * @return {Promise} a promise that either resolves on observable completion or
       *  rejects with the handled error
       */
      forEach(next, PromiseCtor) {
          if (!PromiseCtor) {
              if (root.Rx && root.Rx.config && root.Rx.config.Promise) {
                  PromiseCtor = root.Rx.config.Promise;
              }
              else if (root.Promise) {
                  PromiseCtor = root.Promise;
              }
          }
          if (!PromiseCtor) {
              throw new Error('no Promise impl found');
          }
          return new PromiseCtor((resolve, reject) => {
              const subscription = this.subscribe((value) => {
                  if (subscription) {
                      // if there is a subscription, then we can surmise
                      // the next handling is asynchronous. Any errors thrown
                      // need to be rejected explicitly and unsubscribe must be
                      // called manually
                      try {
                          next(value);
                      }
                      catch (err) {
                          reject(err);
                          subscription.unsubscribe();
                      }
                  }
                  else {
                      // if there is NO subscription, then we're getting a nexted
                      // value synchronously during subscription. We can just call it.
                      // If it errors, Observable's `subscribe` imple will ensure the
                      // unsubscription logic is called, then synchronously rethrow the error.
                      // After that, Promise will trap the error and send it
                      // down the rejection path.
                      next(value);
                  }
              }, reject, resolve);
          });
      }
      _subscribe(subscriber) {
          return this.source.subscribe(subscriber);
      }
      /**
       * An interop point defined by the es7-observable spec https://github.com/zenparsing/es-observable
       * @method Symbol.observable
       * @return {Observable} this instance of the observable
       */
      [$$observable]() {
          return this;
      }
  }
  // HACK: Since TypeScript inherits static properties too, we have to
  // fight against TypeScript here so Subject can have a different static create signature
  /**
   * Creates a new cold Observable by calling the Observable constructor
   * @static true
   * @owner Observable
   * @method create
   * @param {Function} subscribe? the subscriber function to be passed to the Observable constructor
   * @return {Observable} a new cold observable
   */
  Observable.create = (subscribe) => {
      return new Observable(subscribe);
  };

  /**
   * An error thrown when an action is invalid because the object has been
   * unsubscribed.
   *
   * @see {@link Subject}
   * @see {@link BehaviorSubject}
   *
   * @class ObjectUnsubscribedError
   */
  class ObjectUnsubscribedError extends Error {
      constructor() {
          super('object unsubscribed');
          this.name = 'ObjectUnsubscribedError';
      }
  }

  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  class SubjectSubscription extends Subscription {
      constructor(subject, subscriber) {
          super();
          this.subject = subject;
          this.subscriber = subscriber;
          this.isUnsubscribed = false;
      }
      unsubscribe() {
          if (this.isUnsubscribed) {
              return;
          }
          this.isUnsubscribed = true;
          const subject = this.subject;
          const observers = subject.observers;
          this.subject = null;
          if (!observers || observers.length === 0 || subject.isStopped || subject.isUnsubscribed) {
              return;
          }
          const subscriberIndex = observers.indexOf(this.subscriber);
          if (subscriberIndex !== -1) {
              observers.splice(subscriberIndex, 1);
          }
      }
  }

  /**
   * @class SubjectSubscriber<T>
   */
  class SubjectSubscriber extends Subscriber {
      constructor(destination) {
          super(destination);
          this.destination = destination;
      }
  }
  /**
   * @class Subject<T>
   */
  class Subject extends Observable {
      constructor() {
          super();
          this.observers = [];
          this.isUnsubscribed = false;
          this.isStopped = false;
          this.hasError = false;
          this.thrownError = null;
      }
      [$$rxSubscriber]() {
          return new SubjectSubscriber(this);
      }
      lift(operator) {
          const subject = new AnonymousSubject(this, this);
          subject.operator = operator;
          return subject;
      }
      next(value) {
          if (this.isUnsubscribed) {
              throw new ObjectUnsubscribedError();
          }
          if (!this.isStopped) {
              const { observers } = this;
              const len = observers.length;
              const copy = observers.slice();
              for (let i = 0; i < len; i++) {
                  copy[i].next(value);
              }
          }
      }
      error(err) {
          if (this.isUnsubscribed) {
              throw new ObjectUnsubscribedError();
          }
          this.hasError = true;
          this.thrownError = err;
          this.isStopped = true;
          const { observers } = this;
          const len = observers.length;
          const copy = observers.slice();
          for (let i = 0; i < len; i++) {
              copy[i].error(err);
          }
          this.observers.length = 0;
      }
      complete() {
          if (this.isUnsubscribed) {
              throw new ObjectUnsubscribedError();
          }
          this.isStopped = true;
          const { observers } = this;
          const len = observers.length;
          const copy = observers.slice();
          for (let i = 0; i < len; i++) {
              copy[i].complete();
          }
          this.observers.length = 0;
      }
      unsubscribe() {
          this.isStopped = true;
          this.isUnsubscribed = true;
          this.observers = null;
      }
      _subscribe(subscriber) {
          if (this.isUnsubscribed) {
              throw new ObjectUnsubscribedError();
          }
          else if (this.hasError) {
              subscriber.error(this.thrownError);
              return Subscription.EMPTY;
          }
          else if (this.isStopped) {
              subscriber.complete();
              return Subscription.EMPTY;
          }
          else {
              this.observers.push(subscriber);
              return new SubjectSubscription(this, subscriber);
          }
      }
      asObservable() {
          const observable = new Observable();
          observable.source = this;
          return observable;
      }
  }
  Subject.create = (destination, source) => {
      return new AnonymousSubject(destination, source);
  };
  /**
   * @class AnonymousSubject<T>
   */
  class AnonymousSubject extends Subject {
      constructor(destination, source) {
          super();
          this.destination = destination;
          this.source = source;
      }
      next(value) {
          const { destination } = this;
          if (destination && destination.next) {
              destination.next(value);
          }
      }
      error(err) {
          const { destination } = this;
          if (destination && destination.error) {
              this.destination.error(err);
          }
      }
      complete() {
          const { destination } = this;
          if (destination && destination.complete) {
              this.destination.complete();
          }
      }
      _subscribe(subscriber) {
          const { source } = this;
          if (source) {
              return this.source.subscribe(subscriber);
          }
          else {
              return Subscription.EMPTY;
          }
      }
  }

  function throwError(e) { throw e; }

  /**
   * @class BehaviorSubject<T>
   */
  class BehaviorSubject extends Subject {
      constructor(_value) {
          super();
          this._value = _value;
      }
      getValue() {
          if (this.hasError) {
              throwError(this.thrownError);
          }
          else if (this.isUnsubscribed) {
              throwError(new ObjectUnsubscribedError());
          }
          else {
              return this._value;
          }
      }
      get value() {
          return this.getValue();
      }
      _subscribe(subscriber) {
          const subscription = super._subscribe(subscriber);
          if (subscription && !subscription.isUnsubscribed) {
              subscriber.next(this._value);
          }
          return subscription;
      }
      next(value) {
          super.next(this._value = value);
      }
  }

  const observable = Observable.create( observer => {
    observer.next(1);
    setTimeout(() => {
      observer.complete();
    }, 1000);
  });

  const x = new BehaviorSubject( 5 );
  x.subscribe( x => console.log( 'x is', x ) );
  x.next( 3 );

  observable.subscribe( x => console.log('got value ' + x) );

}());