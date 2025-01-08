export function calcExpression(inputOp, input1, input2) {
  const knownOperations = ["+", "-", "/", "*"];
  const op = knownOperations.includes(inputOp) ? inputOp : undefined;
  if (!op) {
    return;
  }

  const operand1 = parseInt(input1);
  const operand2 = parseInt(input2);

  return eval(`${operand1} ${op} ${operand2}`);
}
