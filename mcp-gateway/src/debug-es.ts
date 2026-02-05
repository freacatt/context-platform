
import * as es from 'eventsource';
console.log('Keys:', Object.keys(es));
console.log('es:', es);
try {
  // @ts-ignore
  console.log('es.default:', es.default);
} catch (e) {}
try {
    // @ts-ignore
    console.log('es.EventSource:', es.EventSource);
} catch (e) {}
