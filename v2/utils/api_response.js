
function created(res, data, message = "Successful") {
  return res.status(201).json({
    message,
    data,
    success: true,
  })
}

function successAction(res, message = "Successful") {
  return res.status(200).json({
    message,
    data: null,
    success: true,
  })
}

function successPaginated(res, data, message = "Fetched successfully") {
  return res.status(200).json({
    message,
    data,
    success: true,
  })
}

function serverError(res, message = "Something went wrong") {
  return res.status(500).json({
    message,
    error: null,
    success: false,
  })
}

function success (res, data, message = "Successful") {
  return res.status(200).json({
    message,
    data: data,
    success: true,
  })
} 

function badRequest (res, errors, message = "Bad request") {
  return res.status(400).json({
    message,
    errors,
    success: false,
  })
}

function unAuthorized(res, error, message = "Unauthorized request") {
  return res.status(403).json({
    message,
    error,
    success: false,
  })
}

function maxSizeExceeded (res, error, message = 'maximum size exceeded') {
  return res.status(413).json({
    message,
    error,
    success: false
  });
}

module.exports = { created, successAction, successPaginated, success, serverError, badRequest, unAuthorized, maxSizeExceeded }