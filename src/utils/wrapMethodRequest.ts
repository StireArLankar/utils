// function loggedMethod<
//   This,
//   Args extends any[],
//   Return,
//   Fn extends (this: This, ...args: Args) => Return
// >(target: Fn, context: ClassMethodDecoratorContext<This, Fn>) {
//   const methodName = String(context.name);

//   function replacementMethod(this: This, ...args: Args): Return {
//     console.log(`LOG: Entering method '${methodName}'.`);
//     const result = target.call(this, ...args);
//     console.log(`LOG: Exiting method '${methodName}'.`);
//     return result;
//   }

//   return replacementMethod as Fn;
// }

// function wrappedMethod<
//   This,
//   Args extends any[],
//   Return,
//   Fn extends (this: This, ...args: Args) => Promise<Return>
// >(target: Fn, _: ClassMethodDecoratorContext<This, Fn>) {
//   const promiseMap = new Map<string, Promise<Return>>();

//   async function replacementMethod(this: This, ...args: Args): Promise<Return> {
//     const kee = JSON.stringify(args);

//     const tempPromise = promiseMap.get(kee);

//     if (tempPromise) {
//       return tempPromise;
//     }

//     const promise = target.call(this, ...args);

//     promiseMap.set(kee, promise);

//     const res = await promise;

//     promiseMap.delete(kee);

//     return res;
//   }

//   return replacementMethod as Fn;
// }

// class Person {
//   name: string;
//   constructor(name: string) {
//     this.name = name;
//   }

//   @loggedMethod
//   greet(test: string): string {
//     console.log(`Hello, my name is ${this.name}. ${test}`);
//     return "123";
//   }

//   @wrappedMethod
//   async test(arg: string) {
//     await new Promise((res) => setTimeout(res, 3000));
//     return "test " + arg;
//   }
// }

// const p = new Person("Ray");
// // p.greet(`asd`);

// const init2 = async () => {
//   p.test("228").then(console.log);
//   await new Promise((res) => setTimeout(res, 1000));
//   p.test("228").then(console.log);
//   p.test("322").then(console.log);
// };

// init2();

export {};
