import {hasOwnProperty} from "sequelize";

const someObject = { '__proto__' : { isAdmin: true}};

console.log(hasOwnProperty(someObject));