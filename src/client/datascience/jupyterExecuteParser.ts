// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { KernelMessage } from '@jupyterlab/services';
import { JSONObject } from '@phosphor/coreutils';
import { ICell } from './types';

function parseJupyter(d: string | string[] | JSONObject) : string {
    return d as string;
}

// tslint:disable-next-line:no-any
function identity(d: string | string[] | JSONObject) : string {
    return d.toString();
}

function parseJson(d: string | string[] | JSONObject) : string {
    return JSON.stringify(d);
}

function parseMarkdown(d: string | string[] | JSONObject) : string {
    return d as string;
}

const parseFunctions : { [index: string]: (d: string | string[] | JSONObject) => string } =
{
    'application/vnd.jupyter' : parseJupyter,
    'application/vnd.jupyter.cells' : parseJupyter,
    'application/vnd.jupyter.dragindex' : parseJupyter,
    'application/x-ipynb+json' : parseJson,
    'application/geo+json': parseJson,
    'application/vnd.plotly.v1+json': parseJson,
    'application/vdom.v1+json' : parseJson,
    'text/html' : identity,
    'image/svg+xml' : identity,
    'image/png' : identity,
    'image/jpeg' : identity,
    'text/markdown' : parseMarkdown,
    'application/pdf' : identity,
    'text/latex' : identity,
    'application/json' : parseJson,
    'text/plain' : identity
};

export const parseExecuteMessage = (msg: KernelMessage.IExecuteResultMsg, cell: ICell) => {
    Object.keys(msg.content.data).map((key: string) => {
        cell.output += parseFunctions[key](msg.content.data[key]);
    });
};
