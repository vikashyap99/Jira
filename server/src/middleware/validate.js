const { failure } = require('../utils/apiResponse');

function validate(schema, source = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], { abortEarly: false, stripUnknown: true });
    if (error) {
      const details = error.details.map((d) => d.message);
      return failure(res, 'Validation failed', 400, details);
    }
    req[source] = value;
    next();
  };
}

module.exports = validate;
