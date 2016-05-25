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

//- Contact
var ContactSchema = new Schema({
	_id: {type: String, required: true},
	bizid: {type: String, index: true, required: true},
	email : {type: String},
	first_name: String,
	last_name: String,
	dob: Date,
	// meta
	deleted: {type: Boolean, default: false},
	last_modified: {type: Date, required: true}
});

var BackgroundJobSchema = new Schema({
	sch_identifier : {type: String, unique: true},
	type: {type: String},
	params: {type: Object},
	date: {type: Date, default: new Date()},
	status: {type: String, enum: ['queued', 'started', 'failed', 'finished'], default: 'queued'}
});


//- BusinessActivity
var BusinessActivitySchema = new Schema({
	log_info : {
		type: {type: String},
		event_time : Date,
	},
	activity_transId : String,
	data: Object,
	bizid: String,
	email: String,
	jobIds: Array,
	scheduled_status: {type :String, default: ''}
});

var GiftCardTransactionsSchema = new Schema({
	_id : String,
	bizid : String,
	user_id : String,
	status : {type: String, enum: ['initiated', 'redeemed','failed']},
	amount : String,
	source : {type: String, enum: ['referal', 'promotion']},
	issue_time : Date,
	redeemed_time : Date,
	email : String,
	onetime_cards : {type:Array}
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

// FeedSource
var FeedSource = new Schema({
	_id: {type: String, required: true},
	name: {type: String, required: true},
	lambda_fn: {type: String, required: true},
	input_source: {
		type: {type: String, enum:['couch','mongo']},
		couch: {
			bucket: String,
			design_doc: String,
			view: String
		}
	},
	// Hooks are simple node js functions which accept the
	// input contact document and perform transformation to it
	// Pre hooks are called before the the lambda function is invoked
	// and post hooks are called after (are post hooks even needed?)
	//
	// They are JS moduled editable from a webinterface in the format of
	// module.exports = function preTransform(contact, done) {
	//	Do some stuff here
	//  done(null, result);
	// }
	hooks: {
		source: String,
		pre: String,
		post: String
	},
	schedule: {
		cron_expression: {type: String}
	}
});

exports.db = mongoose;
exports.models = {
  User: mongoose.model('User', UserSchema, 'businesses'),
  Contact: mongoose.model('Contact', ContactSchema, 'contacts'),
  SocialMapping: mongoose.model('SocialMapping', SocialMappingSchema),
	FeedSource: mongoose.model('FeedSource', FeedSource),
	BusinessActivity: mongoose.model('BusinessActivity', BusinessActivitySchema, 'businessactivities'),
	BackgroundJob: mongoose.model('BackgroundJob', BackgroundJobSchema, 'backgroundjobs'),
	GiftCardTransaction: mongoose.model('GiftCardTransaction', GiftCardTransactionsSchema, 'giftcardtransactions')
};
