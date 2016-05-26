var mongoose = require('mongoose');
var Schema   = mongoose.Schema;

exports.connect = function(url) {
	mongoose.connect(url, function(err) {
		if (err) {
			throw err;
		}
	});
	return exports;
};

//- User
var UserSchema = new Schema({
	bizid: { type: String, unique: true, index: true },
	name: String,
	email: { type: String, unique: true, index: true },
	password: { type: String },
	role: { type: String, enum: ['user','admin'], default: 'user' },
	joined: { type: Date, default: Date.now },
  
  // binding sf tokens with User, as it's easy to retrieve the same thru req.user.salesforce instead of hitting mongo one another time if placed anywhere else.
  salesforce: {
    access_token: String,
    instance_url: String,
    refresh_token: String
  }
});

// Maps fb/twitter details with bizid
var SocialMappingSchema = new Schema({
    bizid: {type: String, index: true},
    twitter: {
        access_token_key: String,
        access_token_secret: String,
        last_synched_id: String,
        last_modified: Date
    },
    fb : {
        access_token : String,
        last_modified: Date,
        since : String
    }
});
exports.db = mongoose;
exports.models = {
  User: mongoose.model('User', UserSchema, 'businesses'),
  SocialMapping: mongoose.model('SocialMapping', SocialMappingSchema)
};
