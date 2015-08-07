import Rx from 'rx';
import {Channel} from 'rxmq';
import {MiddlewareSubject, MiddlewareAsyncSubject} from './rx';

export const addChannelMiddleware = function() {
    // patch subject function
    const defaultSubject = Channel.prototype.subject;
    Channel.prototype.subject = function(name, {Subject = MiddlewareSubject} = {}) {
        return defaultSubject.call(this, name, {Subject});
    };

    // patch request function
    Channel.prototype.request = function({topic, data, Subject = MiddlewareAsyncSubject}) {
        const subj = this.utils.findSubjectByName(this.subjects, topic);
        if (!subj) {
            return Rx.Observable.never();
        }

        // create reply subject
        const replySubject = new Subject();
        replySubject.middleware = subj.replyMiddleware;
        subj.onNext({replySubject, data});
        return replySubject;
    };
};
