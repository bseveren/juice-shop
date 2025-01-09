const sh = async cmd =>
 new Promise((resolve, reject) => {
   console.log('SH executed...');
   try {
     exec(cmd, {
       maxBuffer: 1024 * 500, // increase the max buffer to 500KB instead of default 200kb
     }, (err, stdout, stderr) => {
       if (err) {
         console.log('Error 123: ', err);
         reject(err);
       } else {
         console.log('stderr:', stderr);
         console.log('stdout:', stdout);

         resolve({ stdout, stderr });
       }
     });
   } catch (err) {
     console.log(`exception: ${err}`);
     reject(err);
   }
 });

const run = async (cmd, next) => {
  console.log('CMD:', cmd);
  const { stdout, stderr } = await sh(cmd);
  console.log('Fnction done...');
  console.log('stdout:', stdout);
  console.log('stderr:', stderr);
  next(stderr, stdout);
};
