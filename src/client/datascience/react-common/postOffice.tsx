// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import * as React from 'react';
import { IWebPanelMessage } from "../../common/application/types";

interface IVsCodeApi {
    postMessage(msg: any) : void;
    setState(state: any) : void;
    getState() : any;
}

interface IPostOfficeProps {
    messageHandlers: {[index: string]: (msg?: any) => void};
}

// This special function talks to vscode from a web panel
export declare function acquireVsCodeApi(): IVsCodeApi;


export class PostOffice extends React.Component<IPostOfficeProps> {
    constructor(props: IPostOfficeProps) {
        super(props);
    }

    public componentDidMount() {
        window.addEventListener('message', this.handleMessages);
    }

    public componentWillUnmount() {
        window.removeEventListener('message', this.handleMessages);
    }

    public static canSendMessages() {
        if (typeof acquireVsCodeApi !== 'undefined') {
            return true;
        }
        return false;
    }

    public static sendMessage(message: IWebPanelMessage) {
        if (PostOffice.canSendMessages()) {
            acquireVsCodeApi().postMessage(message);
        }
    }

    public render() {
        return null;
    }

    private handleMessages = (ev: MessageEvent) => {
        if (this.props) {
            const msg = ev.data as IWebPanelMessage;
            if (msg) {
                if (this.props.messageHandlers.hasOwnProperty(msg.type)) {
                    this.props.messageHandlers[msg.type](msg.payload);
                }
            }
        }
    }
}
