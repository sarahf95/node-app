/*
 * Request Handlers
 *
 */

// Dependencies
const _data = require('./data');
const helpers = require('./helpers');

// Define handlers
var handlers = {};

// Ping handler
handlers.ping = function(data, callback) {
  callback(200);
};

// Not found handler
handlers.notFound = function(data, callback) {
  callback(404);
};

handlers.users = function(data, callback) {
  var acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._users[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Container for users submethods
handlers._users = {};

// Users - post
handlers._users.post = function(data, callback) {
  // check that all required fields are filled out
  var firstName =
    typeof data.payload.firstName == 'string' &&
    data.payload.firstName.trim().length > 0
      ? data.payload.firstName.trim()
      : false;
  var lastName =
    typeof data.payload.lastName == 'string' &&
    data.payload.lastName.trim().length > 0
      ? data.payload.lastName.trim()
      : false;
  var phone =
    typeof data.payload.phone == 'string' &&
    data.payload.phone.trim().length == 10
      ? data.payload.phone.trim()
      : false;
  var password =
    typeof data.payload.password == 'string' &&
    data.payload.password.trim().length > 0
      ? data.payload.password.trim()
      : false;
  var tosAgreement =
    typeof data.payload.tosAgreement == 'boolean' &&
    data.payload.tosAgreement == true
      ? true
      : false;

  if (firstName && lastName && phone && password && tosAgreement) {
    // Make sure the user doesn't already exist
    _data.read('users', phone, function(err, data) {
      if (err) {
        // Hash the password
        let hashedPassword = helpers.hash(password);

        if (hashedPassword) {
          // Create the user object
          let userObject = {
            firstName: firstName,
            lastName: lastName,
            phone: phone,
            hashedPassword: hashedPassword,
            tosAgreement: true
          };

          // Store the user
          _data.create('users', phone, userObject, function(err) {
            if (!err) {
              callback(200);
            } else {
              callback(500, { Error: 'Could not crate the new user' });
            }
          });
        } else {
          callback(500, { Error: "Could not hash user's password" });
        }
      } else {
        // User with that phone number already exists
        callback(400, { Error: 'A user with that phonenumber already exists' });
      }
    });
  } else {
    callback(400, { Error: 'Missing required fields' });
  }
};
// Users - get
// Required data: phone
// Option data: none
handlers._users.get = function(data, callback) {
  // Check that the phone number is valid
  let phone =
    typeof data.queryStringObject.phone == 'string' &&
    data.queryStringObject.phone.trim().length == 10
      ? data.queryStringObject.phone.trim()
      : false;
  if (phone) {
    // Get the token from the headers
    let token =
      typeof data.headers.token == 'string' ? data.headers.token : false;
    // Verify that the given token from headers if valid for the phone number
    handlers._tokens.verifyToken(token, phone, function(tokenIsValid) {
      if (tokenIsValid) {
        // Lookup user
        _data.read('users', phone, function(err, data) {
          if (!err && data) {
            // Remove the hashed password from the user object before returning it to the requester
            delete data.hashedPassword;
            callback(200, data);
          } else {
            callback(404);
          }
        });
      } else {
        callback(403, {
          Error: 'Missing required token in header, or token is invalid'
        });
      }
    });
  } else {
    callback(400, { Error: 'Missing required field' });
  }
};

// Users - put
// Required data : phone
// Optional data : firstName, lastName, password (at least one must be specified)
handlers._users.put = function(data, callback) {
  // check for required field
  let phone =
    typeof data.payload.phone == 'string' && data.payload.phone.trim().length
      ? data.payload.phone.trim()
      : false;

  // Check fort he optional fields
  var firstName =
    typeof data.payload.firstName == 'string' &&
    data.payload.firstName.trim().length > 0
      ? data.payload.firstName.trim()
      : false;
  var lastName =
    typeof data.payload.lastName == 'string' &&
    data.payload.lastName.trim().length > 0
      ? data.payload.lastName.trim()
      : false;
  var password =
    typeof data.payload.password == 'string' &&
    data.payload.password.trim().length > 0
      ? data.payload.password.trim()
      : false;

  // Error if the phone is invalid
  if (phone) {
    //Error if nothing is sent to update
    if (firstName || lastName || password) {
      // Get the token from the headers
      let token =
        typeof data.headers.token == 'string' ? data.headers.token : false;

      handlers._tokens.verifyToken(token, phone, function(tokenIsValid) {
        if (tokenIsValid) {
          _data.read('users', phone, function(err, usersData) {
            if (!err && usersData) {
              // Update the neccessary fields
              if (firstName) {
                usersData.firstName = firstName;
              }
              if (lastName) {
                usersData.lastName = lastName;
              }
              if (password) {
                usersData.password = helpers.hash(password);
              }
              // Store the new updates
              _data.update('users', phone, usersData, function(err) {
                if (!err) {
                  callback(200);
                } else {
                  callback(500, { Error: 'Could not update the user' });
                }
              });
            } else {
              callback(400, { Error: 'The specified user does not exist' });
            }
          });
        } else {
          callback(403, { Error: 'Missing required token header' });
        }
      });
    } else {
      callback(400, { Error: 'Missing fields to udpate' });
    }
  }
};
// Users - delete
// Required fields : phone
// @TODO only let an authenticated user delete their object
// @TODO clean up (delete) any other data files associated with this user
handlers._users.delete = function(data, callback) {
  // check for required field
  let phone =
    typeof data.payload.phone == 'string' &&
    data.payload.phone.trim().length == 10
      ? data.payload.phone.trim()
      : false;
  if (phone) {
    let token =
      typeof data.headers.token == 'string' ? data.headers.token : false;

    handlers._tokens.verifyToken(token, phone, function(tokenIsValid) {
      if (tokenIsValid) {
        // Lookup user
        _data.read('users', phone, function(err, data) {
          if (!err && data) {
            _data.delete('users', phone, function(err) {
              if (!err) {
                callback(200);
              } else {
                callback(500, { Error: 'Could not delete the specified user' });
              }
            });
          } else {
            callback(400, { Error: 'Could not find the specified user' });
          }
        });
      } else {
        callback(403, { Error: 'Missing required token header' });
      }
    });
  } else {
    callback(400, { Error: 'Missing required field' });
  }
};

// Tokens
handlers.tokens = function(data, callback) {
  var acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._tokens[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Container for all the tokens methods
handlers._tokens = {};

// Tokens - post
// Required data: phone, password
// Optional data: none
handlers._tokens.post = function(data, callback) {
  var phone =
    typeof data.payload.phone == 'string' &&
    data.payload.phone.trim().length == 10
      ? data.payload.phone.trim()
      : false;
  var password =
    typeof data.payload.password == 'string' &&
    data.payload.password.trim().length > 0
      ? data.payload.password.trim()
      : false;

  if (phone && password) {
    // Lookup the user who matches that phone number
    _data.read('users', phone, function(err, usersData) {
      if (!err && usersData) {
        // Hash the sent password and compare to stored password
        let hashedPassword = helpers.hash(password);
        if (hashedPassword == usersData.hashedPassword) {
          // If valid,c reate a new token witha  random name. Set expiration date 1 hour in the future
          let tokenId = helpers.createRandomString(20);
          let expires = Date.now() + 1000 * 60 * 60;
          let tokenObject = {
            phone: phone,
            id: tokenId,
            expires: expires
          };
          _data.create('tokens', tokenId, tokenObject, function(err) {
            if (!err) {
              callback(200, tokenObject);
            } else {
              callback(500, {
                Error: 'Could not create new token.'
              });
            }
          });
        } else {
          callback(400, {
            Error: "Password did not match the specified user's password"
          });
        }
      } else {
        callback(400, { Error: 'Could not find specified user' });
      }
    });
  } else {
    callback(400, { Error: 'Missing required fields' });
  }
};

// Tokens - get
// Requried data : id
// Optional data : none
handlers._tokens.get = function(data, callback) {
  let id =
    typeof data.queryStringObject.id == 'string' &&
    data.queryStringObject.id.trim().length == 20
      ? data.queryStringObject.id.trim()
      : false;
  if (id) {
    // Lookup token
    _data.read('tokens', id, function(err, data) {
      if (!err && data) {
        callback(200, data);
      } else {
        callback(404);
      }
    });
  } else {
    callback(400, { Error: 'Missing required field' });
  }
};

// Tokens - put
// Required data : id, extend
//
handlers._tokens.put = function(data, callback) {
  console.log('data', data);

  console.log('data.payload.id :', data.payload.id);
  console.log('data.payload.id type:', typeof data.payload.id);
  console.log('data.payload.extend :', data.payload.extend);
  console.log('data.payload.extend type:', typeof data.payload.extend);
  let id =
    typeof data.payload.id == 'string' && data.payload.id.trim().length == 20
      ? data.payload.id.trim()
      : false;
  let extend =
    typeof data.payload.extend == 'boolean' && data.payload.extend == true
      ? true
      : false;
  console.log('id', id, 'extend', extend);
  if (id && extend) {
    _data.read('tokens', id, function(err, tokenData) {
      if (!err && tokenData) {
        // Check to make sure the token isn't already expired
        if (tokenData.expires > Date.now()) {
          // Set the expiration an hour from now
          tokenData.expires = Date.now() + 1000 * 60 * 60;

          // Store the new updates
          _data.update('tokens', id, tokenData, function(err) {
            if (!err) {
              callback(200);
            } else {
              callback(400, {
                Error: "Could not update the token's expiration"
              });
            }
          });
        } else {
          callback(400, {
            Error: 'The token has already expired and cannot be extended'
          });
        }
      } else {
        callback(400, { Error: 'Specified token does not exist' });
      }
    });
  } else {
    callback(400, {
      Error: 'Missing required field(s) or field(s) are invalid'
    });
  }
};

// Tokens - delete
handlers._tokens.delete = function(data, callback) {
  // check for required field
  let id =
    typeof data.payload.id == 'string' && data.payload.id.trim().length == 20
      ? data.payload.id.trim()
      : false;
  if (id) {
    // Lookup user
    _data.read('tokens', id, function(err, data) {
      if (!err && data) {
        _data.delete('tokens', id, function(err) {
          if (!err) {
            callback(200);
          } else {
            callback(500, { Error: 'Could not delete the specified token' });
          }
        });
      } else {
        callback(400, { Error: 'Could not find the specified token' });
      }
    });
  } else {
    callback(400, { Error: 'Missing required field' });
  }
};

// Verify if a given token id is currently valid for a given user
handlers._tokens.verifyToken = function(id, phone, callback) {
  // Lookup th etoken
  _data.read('tokens', id, function(err, tokenData) {
    if (!err && tokenData) {
      // Check that token is for given user and has not expired
      if (tokenData.phone == phone && tokenData.expires > Date.now()) {
        callback(true);
      } else {
        callback(false);
      }
    } else {
      callback(false);
    }
  });
};

// Export the module
module.exports = handlers;
