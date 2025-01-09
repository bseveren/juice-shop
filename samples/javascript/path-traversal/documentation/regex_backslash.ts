const regex = /(?:^|[\\\/])\.\.(?:[\\\/]|$)/;
// const UP_PATH_REGEXP = /(?:^|[\\/])\.\.(?:[\\/]|$)/;
const fn = (val) => { console.log(val, regex.test(val)); };
fn('../../etc/passwd');
fn('..\..\etc\passwd');
fn('..\\..\\etc\\passwd');
fn('....//etc/passwd');