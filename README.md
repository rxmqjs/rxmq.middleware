# Rxmq.js middleware support

> A plugin that adds support for topic-based middleware for Rxmq.js

## What is it?

This is a simple plugin that provides a topic-based middleware support for Rxmq.js.
Currently you can use middleware plugin in two ways:

1. Just use the given `MiddlewareSubject` without changing your Rxmq instance at all (only usable for `subject` middleware, no way to inject it into `replySubject`)
2. Inject the overrides for default `Channel.subject()` and `Channel.request()` functions that default all subjects and requests to use middleware-based subjects.

The middleware will be automatically applied to all data going through corresponding topics and reply subjects.
This can be useful in cases when you want to modify the data going to subscribers of specific topic without directly modifying the logic behind the dispatcher.

## Quick start

As mentioned in previous section, there are two ways to use this plugin.
The simple usage looks like this:
```js
import {MiddlewareSubject} from 'rxmq.middleware';

const subj = channel.subject('test', {Subject: MiddlewareSubject});
// add middleware
subj.middleware.add((val) => val + '_ok');
// do your stuff
subj.subscribe((val) => {
    console.log(val); // will output "test_ok"
});
subj.onNext('test');
```

The other way is to inject the replacements for `subject()` and `request()` methods that will automatically add middleware to all subjects and replySubject.
You can do this like so:
```js
import Rxmq from 'rxmq';
import addChannelMiddleware from 'rxmq.middleware';
// patch in middleware support
addChannelMiddleware();

// Rxmq is now patched with middleware support
// put your other code here
```

When patcher you can use middleware by simply refering to `subject.middleware` object, e.g.:
```js
const sub = channel.subject('test');
const m = sub.middleware.add((value) => value + '_middleware');
sub.subscribe((val) => {
    console.log(val); // will output "string_middleware"
    // you can remove middleware using reference
    sub.middleware.remove(m);
});
sub.onNext('string');
```

If you want to use middleware that should be applied to `replySubject`, you can do the following:
```js
const sub = channel.subject('test');
// this middleware will apply to normal subject() subscriptions
sub.middleware.add(({data, replySubject}) => {
    return {data: data + '_modified', replySubject};
});
// this middleware will apply to all replySubject subscriptions, i.e. when request().subscribe() is called
sub.replyMiddleware.add((val) => val + '_reply_mod');
sub.subscribe(({data, replySubject}) => {
    console.log(data); // will output "request_modified"
    replySubject.onNext('replyData');
    replySubject.onCompleted();
});
channel.request({topic, data: 'request'})
    .subscribe((replyData) => {
        console.log(replyData); // will output "replyData_reply_mod"
    });
```

## License

[MIT](http://www.opensource.org/licenses/mit-license)
