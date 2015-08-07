import test from 'tape';
import Rxmq from 'rxmq';
import Rx from 'rx';
import addChannelMiddleware, {MiddlewareSubject} from '../index';

// test
test('Rxmq middleware', (it) => {
    const channel = Rxmq.channel('test');
    const topic = 'test.topic';

    // test without middleware
    it.test('# should use normal subject middleware with just new subject', (t) => {
        const nchannel = Rxmq.channel('customSubjectTest');
        const subj = nchannel.subject('test-custom-middleware', {Subject: MiddlewareSubject});
        subj.middleware.add((val) => val + '_ok');
        subj.subscribe((val) => {
            t.equal(val, 'test_ok');
            t.end();
        });
        subj.onNext('test');
    });

    // patch in middleware support
    addChannelMiddleware();
    // get middleware
    const mid = channel.subject(topic).middleware;

    it.test('# should support middleware', (t) => {
        t.ok(channel.subject(topic).middleware);
        t.end();
    });

    it.test('# should use subscribe middleware', (t) => {
        const suffix = '_appended';
        const testData = 'testGlobalPush';
        const sub = channel.subject(topic);

        sub.middleware.add((value) => value + suffix);

        sub.subscribe((val) => {
            t.equals(val, testData + suffix);
            t.end();
        });

        channel.subject(topic).onNext(testData);
    });

    it.test('# should use request middleware', (t) => {
        const rrTopic = 'request-reply';
        const rrSub = channel.subject(rrTopic);
        const rrMid = rrSub.middleware;
        const rrReplyMid = rrSub.replyMiddleware;
        const testRequest = 'test request';
        const testReply = 'test reply';
        const suffix = '_appended';

        // normal
        rrMid.add(({data, replySubject}) => {
            return {data: data + suffix, replySubject};
        });
        // reply
        rrReplyMid.add((val) => val + suffix);

        rrSub.subscribe(({data, replySubject}) => {
            t.equal(data, testRequest + suffix);
            replySubject.onNext(testReply);
            replySubject.onCompleted();
        });
        channel.request({topic: rrTopic, data: testRequest})
            .subscribe((replyData) => {
                t.equal(replyData, testReply + suffix);
                t.end();
            });
    });

    it.test('# should clean middleware', (t) => {
        mid.clear();
        mid.list()
            .startWith(0)
            .scan((acc) => acc + 1)
            .throttle()
            .subscribe((all) => {
                t.equal(all, 0);
                t.end();
            });
    });

    it.test('# should delete one middleware', (t) => {
        mid.clear();
        const m1 = mid.add(() => {});
        const m2 = mid.add(() => {});
        mid.remove(m1);
        mid.list()
            .subscribe((middleware) => {
                t.equal(middleware.name, m2.name);
                t.end();
            });
    });

    // test that old methods still work OK
    it.test('# should create normal one-to-one subscription', (t) => {
        const topicName = 'request-reply-normal';
        const rrchannel = Rxmq.channel('request-normal');
        const rrSub = rrchannel.subject(topicName);
        const testRequest = 'test request';
        const testReply = 'test reply';

        rrSub.subscribe(({data, replySubject}) => {
            t.equal(data, testRequest);
            replySubject.onNext(testReply);
            replySubject.onCompleted();
        });
        rrchannel.request({topic: topicName, data: testRequest})
            .subscribe((replyData) => {
                t.equal(replyData, testReply);
                t.end();
            });
    });

    it.test('# should create new normal subject with custom Rx.Subject', (t) => {
        const nchannel = Rxmq.channel('customSubject');
        const subj = nchannel.subject('test-custom', {Subject: Rx.Subject});
        t.plan(2);
        subj.subscribe(() => {
            t.ok(true);
        }, (e) => { throw e; });
        subj.onNext(1);
        subj.onNext(2);
        subj.onCompleted();
    });

    it.test('# should create and subscribe to normal one-to-many subscription', (t) => {
        const nchannel = Rxmq.channel('test-normal');
        const subj = nchannel.subject('oneToMany');

        // test data
        const testMessage = 'test message';
        // subscribe
        const sub = subj.subscribe((item) => {
            sub.dispose();
            t.equal(item, testMessage);
            t.end();
        });
        subj.onNext(testMessage);
    });
});
