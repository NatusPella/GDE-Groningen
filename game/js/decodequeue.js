// #651: als de tile-worker wegvalt, decoderen de tegels op de hoofdthread. Vielen
// er dan vier tegels tegelijk terug, dan stond de main thread 50-130 ms stil. Deze
// kleine wachtrij doet er één tegelijk en geeft de browser ertussen een beurt
// (setTimeout 0), zodat er een frame tussen kan.
export function serialQueue(task) {
  let tail = Promise.resolve();
  return (arg) => {
    const run = tail
      .then(() => new Promise((r) => setTimeout(r, 0)))
      .then(() => task(arg));
    tail = run.catch(() => {});
    return run;
  };
}
