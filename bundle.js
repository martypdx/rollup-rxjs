(function (Observable) {
  'use strict';

  Observable = 'default' in Observable ? Observable['default'] : Observable;

  const observable = Observable.create( observer => {
    observer.next(1);
    setTimeout(() => {
      observer.complete();
    }, 1000);
  });

  observable.subscribe( x => console.log('got value ' + x) );

}(Observable));