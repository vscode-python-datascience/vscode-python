// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';
import * as React from 'react';
import { ICell } from '../types';
import { PostOffice } from '../react-common/postOffice';
import { HistoryMessages } from '../constants';
import { Cell } from './cell';

export interface IState {
    cells: ICell[];
}

export class MainPanel extends React.Component<{}, IState> {

    private messageHandlers: { [index: string]: (msg?: any) => void } = {
    };

    constructor(props: {}, state: IState) {
        super(props)
        this.state = { cells: [] };
        this.updateState.bind(this);
        this.messageHandlers[HistoryMessages.UpdateState] = this.updateState;

        // Setup up some dummy cells for debugging when not running in vscode
        if (!PostOffice.canSendMessages()) {
            this.state = {cells: [
                {
                    input: 'foo',
                    output: 'foo is new',
                    id: '1'
                }
            ]}
        }
    }

    public render() {
        return (
            <div className='main-panel'>
                <PostOffice messageHandlers={this.messageHandlers} />
                {this.renderCells()}
            </div>
        );
    }

    private renderCells = () => {
        return this.state.cells.map((cell: ICell, index: number) =>
            <Cell input={cell.input} output={cell.output} key={index} id={cell.id} />);
    }

    private updateState = (payload?: any) => {
        if (payload) {
            const cells = payload as ICell[];
            if (cells) {
                this.setState({ cells: cells });
            }
        }
    }
}
