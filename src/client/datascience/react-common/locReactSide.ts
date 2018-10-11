// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { createDeferred, Deferred } from '../../../utils/async';
import { LocalizationMessages } from './locCommon';
import { IMessageHandler, PostOffice } from './postOffice';

export interface ILocalizableProps {
    getLocalized(key: string) : Promise<string>;
}

export class LocReactPostOffice implements IMessageHandler {

    private pendingLocRequests : { [index: string] : Deferred<string> } = {};

    // tslint:disable-next-line:no-any
    public handleMessage = (msg: string, payload? : any) => {
        if (msg === LocalizationMessages.response) {

            // Should have a key and a result value on the payload
            const key = payload.key;
            const result = payload.result;

            if (key && result && this.pendingLocRequests.hasOwnProperty(key)) {
                this.pendingLocRequests[key].resolve(result);
                delete this.pendingLocRequests[key];
            }

            return true;
        }

        return false;
    }

    public async getLocalizedString(key: string) {
        if (PostOffice.canSendMessages()) {
            // Create a deferred promise that will be set when the response comes in
            this.pendingLocRequests[key] = createDeferred<string>();
            PostOffice.sendMessage({type: LocalizationMessages.send, payload: key});
            return this.pendingLocRequests[key].promise;
        }

        return Promise.resolve(key);
    }
}
