// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';
import * as React from 'react';
import { HistoryMessages } from '../constants';
import { ErrorBoundary } from '../react-common/errorBoundary';
import { LocReactPostOffice } from '../react-common/locReactSide';
import { IMessageHandler, PostOffice } from '../react-common/postOffice';
import { ICell } from '../types';
import { Cell } from './cell';

export interface IState {
    cells: ICell[];
    busy: boolean;
    skipNextScroll? : boolean;
}

export interface IMainPanelProps {
    skipDefault?: boolean;
    theme: string;
}

export class MainPanel extends React.Component<IMainPanelProps, IState> implements IMessageHandler {

    private bottom: HTMLDivElement | undefined;
    private locPostOffice : LocReactPostOffice = new LocReactPostOffice();

    // tslint:disable-next-line:max-func-body-length
    constructor(props: IMainPanelProps, state: IState) {
        super(props);
        this.state = { cells: [], busy: false };

        // Setup up some dummy cells for debugging when not running in vscode
        // This should show a gray rectangle in the cell.
        if (!PostOffice.canSendMessages() && !this.props.skipDefault) {
            this.state = {
                busy: false,
                cells: [
                {
                    input: 'get_ipython().run_line_magic("matplotlib", "inline")',
                    output: {
                         'image/svg+xml': [
                          '<svg height=\"110\" width=\"400\">\n',
                          '  <rect height=\"100\" style=\"fill:#FFE0E0;\" width=\"300\"/> \n',
                          '</svg>'
                         ],
                         'text/plain': [
                          '<IPython.core.display.SVG object>'
                         ]
                        },
                    executionCount: 12,
                    id: '1'
                },
                {
                    input: 'df.head()',
                    id: '2',
                    executionCount: 11,
                    output: {
                        'text/html': [
                         '<div>\n',
                         '<table border=\'1\' class=\'dataframe\'>\n',
                         '  <thead>\n',
                         '    <tr style=\'text-align: right;\'>\n',
                         '      <th></th>\n',
                         '      <th>Acceleration</th>\n',
                         '      <th>Cylinders</th>\n',
                         '      <th>Displacement</th>\n',
                         '      <th>Horsepower</th>\n',
                         '      <th>Miles_per_Gallon</th>\n',
                         '      <th>Name</th>\n',
                         '      <th>Origin</th>\n',
                         '      <th>Weight_in_lbs</th>\n',
                         '      <th>Year</th>\n',
                         '    </tr>\n',
                         '  </thead>\n',
                         '  <tbody>\n',
                         '    <tr>\n',
                         '      <th>0</th>\n',
                         '      <td>12.0</td>\n',
                         '      <td>8</td>\n',
                         '      <td>307.0</td>\n',
                         '      <td>130.0</td>\n',
                         '      <td>18.0</td>\n',
                         '      <td>chevrolet chevelle malibu</td>\n',
                         '      <td>USA</td>\n',
                         '      <td>3504</td>\n',
                         '      <td>1970-01-01</td>\n',
                         '    </tr>\n',
                         '    <tr>\n',
                         '      <th>1</th>\n',
                         '      <td>11.5</td>\n',
                         '      <td>8</td>\n',
                         '      <td>350.0</td>\n',
                         '      <td>165.0</td>\n',
                         '      <td>15.0</td>\n',
                         '      <td>buick skylark 320</td>\n',
                         '      <td>USA</td>\n',
                         '      <td>3693</td>\n',
                         '      <td>1970-01-01</td>\n',
                         '    </tr>\n',
                         '    <tr>\n',
                         '      <th>2</th>\n',
                         '      <td>11.0</td>\n',
                         '      <td>8</td>\n',
                         '      <td>318.0</td>\n',
                         '      <td>150.0</td>\n',
                         '      <td>18.0</td>\n',
                         '      <td>plymouth satellite</td>\n',
                         '      <td>USA</td>\n',
                         '      <td>3436</td>\n',
                         '      <td>1970-01-01</td>\n',
                         '    </tr>\n',
                         '    <tr>\n',
                         '      <th>3</th>\n',
                         '      <td>12.0</td>\n',
                         '      <td>8</td>\n',
                         '      <td>304.0</td>\n',
                         '      <td>150.0</td>\n',
                         '      <td>16.0</td>\n',
                         '      <td>amc rebel sst</td>\n',
                         '      <td>USA</td>\n',
                         '      <td>3433</td>\n',
                         '      <td>1970-01-01</td>\n',
                         '    </tr>\n',
                         '    <tr>\n',
                         '      <th>4</th>\n',
                         '      <td>10.5</td>\n',
                         '      <td>8</td>\n',
                         '      <td>302.0</td>\n',
                         '      <td>140.0</td>\n',
                         '      <td>17.0</td>\n',
                         '      <td>ford torino</td>\n',
                         '      <td>USA</td>\n',
                         '      <td>3449</td>\n',
                         '      <td>1970-01-01</td>\n',
                         '    </tr>\n',
                         '  </tbody>\n',
                         '</table>\n',
                         '</div>'
                        ],
                        'text/plain': [
                         '   Acceleration  Cylinders  Displacement  Horsepower  Miles_per_Gallon  \\\n',
                         '0          12.0          8         307.0       130.0              18.0   \n',
                         '1          11.5          8         350.0       165.0              15.0   \n',
                         '2          11.0          8         318.0       150.0              18.0   \n',
                         '3          12.0          8         304.0       150.0              16.0   \n',
                         '4          10.5          8         302.0       140.0              17.0   \n',
                         '\n',
                         '                        Name Origin  Weight_in_lbs        Year  \n',
                         '0  chevrolet chevelle malibu    USA           3504  1970-01-01  \n',
                         '1          buick skylark 320    USA           3693  1970-01-01  \n',
                         '2         plymouth satellite    USA           3436  1970-01-01  \n',
                         '3              amc rebel sst    USA           3433  1970-01-01  \n',
                         '4                ford torino    USA           3449  1970-01-01  '
                        ]
                       }
                }
            ]};
        }
    }

    public componentDidMount() {
        this.scrollToBottom();
    }

    public componentDidUpdate(prevProps, prevState) {
        this.scrollToBottom();
    }

    public render() {
        return (
            <div className='main-panel'>
                <PostOffice messageHandlers={[this, this.locPostOffice]} />
                {this.renderCells()}
                <div ref={this.updateBottom} />
            </div>
        );
    }

    // tslint:disable-next-line:no-any
    public handleMessage = (msg: string, payload?: any) => {
        if (msg === HistoryMessages.UpdateState) {
            this.updateState(payload);
            return true;
        }

        return false;
    }

    private renderCells = () => {
        return this.state.cells.map((cell: ICell, index: number) =>
            <ErrorBoundary key={index}>
                <Cell
                    cell={cell}
                    theme={this.props.theme}
                    getLocalized={this.locPostOffice.getLocalizedString}
                    gotoCode={() => this.gotoCellCode(index)}
                    delete={() => this.deleteCell(index)}/>
            </ErrorBoundary>
        );
    }

    private gotoCellCode = (index: number) => {
        // Send a message to the other side to jump to a particular cell
        PostOffice.sendMessage({ type: HistoryMessages.GotoCodeCell, payload: index});
    }

    private deleteCell = (index: number) => {
        // Send a message to the other side to delete a particular cell.
        PostOffice.sendMessage({ type: HistoryMessages.DeleteCell, payload: index});

        // Do the same thing on this side
        this.setState({
            cells: this.state.cells.filter((c : ICell, i: number) => {
                return i !== index;
            }),
            skipNextScroll: true,
            busy: false});
    }

    private scrollToBottom = () => {
        if (this.bottom && this.bottom.scrollIntoView && !this.state.skipNextScroll) {
            this.bottom.scrollIntoView({behavior: 'smooth'});
        }
    }

    private updateBottom = (newBottom: HTMLDivElement) => {
        this.bottom = newBottom;
    }

    // tslint:disable-next-line:no-any
    private updateState = (payload?: any) => {
        if (payload) {
            const cells = payload as ICell[];
            if (cells) {
                this.setState({ cells: cells });
            }
        }
    }
}
