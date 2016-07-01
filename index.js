import { Observable } from 'rxjs/Observable';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';


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