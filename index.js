import Observable from 'rxjs/Observable';

const observable = Observable.create( observer => {
  observer.next(1);
  setTimeout(() => {
    observer.complete();
  }, 1000);
});

observable.subscribe( x => console.log('got value ' + x) );