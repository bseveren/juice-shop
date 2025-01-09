const secondService = require('./secondService');

exports.handleRequest = (req, res) => {
  const randomNum = randomService.generateRandomNumber(1, 100);

  if (randomNum <= 30) {
    // Path 1
    console.log('Path 1 triggered');
    secondService.redirectRequest(req, res);
  } else if (randomNum <= 60) {
    // Path 2
    console.log('Path 2 triggered');
    anotherFunction(req, res);
  } else {
    // Path 3
    console.log('Path 3 triggered');
    yetAnotherFunction(req, res);
  }
};

const anotherFunction = (req, res) => {
  // Some logic before redirect
  let sum = 0;
  for (let i = 10; i < 20; i++) {
    sum += i;
  }

  if (sum > 100) {
    return res.status(400).json({ message: 'anotherFunction sum is greater than 100' });
  }

  secondService.redirectRequest(req, res);
};
