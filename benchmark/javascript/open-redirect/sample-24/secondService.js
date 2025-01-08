exports.redirectRequest = (req, res) => {
  // some random logic
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += i;
  }

  if (sum > 100) {
    return res.status(400).json({ message: "sum is greater than 100" });
  }

  res.redirect(`https://${req.hostname}${req.url}`);
};
