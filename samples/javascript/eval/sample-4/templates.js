function _buildTemplateFunction(messageTemplate) {
  let code = 'return "';
  code += messageTemplate.replace(/{{([^{]+)}}/gi, function (match, key) {
    return '" + data.' + key + ' + "';
  });
  code += '";';

  return "(function(data) { " + code + " })";
}

export function renderMessages(messageTemplate, recipients) {
  const templateFunction = eval(_buildTemplateFunction(messageTemplate));
  const messages = recipients.map(templateFunction);
  return messages;
}
