// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';
import { min } from 'lodash';
import * as React from 'react';
import { HistoryMessages } from '../constants';
import { ErrorBoundary } from '../react-common/errorBoundary';
import { getLocString } from '../react-common/locReactSide';
import { IMessageHandler, PostOffice } from '../react-common/postOffice';
import { RelativeImage } from '../react-common/relativeImage';
import { CellState, ICell } from '../types';
import { Cell } from './cell';
import { CellButton } from './cellButton';
import './mainPanel.css';
import { MenuBar } from './menuBar';

export interface IState {
    cells: ICell[];
    busy: boolean;
    skipNextScroll? : boolean;
    undoStack : ICell[][];
    redoStack : ICell[][];
}

export interface IMainPanelProps {
    skipDefault?: boolean;
    theme: string;
}

export class MainPanel extends React.Component<IMainPanelProps, IState> implements IMessageHandler {
    private stackLimit = 10;

    private bottom: HTMLDivElement | undefined;

    // tslint:disable-next-line:max-func-body-length
    constructor(props: IMainPanelProps, state: IState) {
        super(props);
        this.state = { cells: [], busy: false, undoStack: [], redoStack : [] };

        // Setup up some dummy cells for debugging when not running in vscode
        // This should show a gray rectangle in the cell.
        if (!this.props.skipDefault) {
            this.state = {
                busy: false,
                undoStack: [],
                redoStack: [],
                cells: [
                    {
                        cell_type: 'code',
                        execution_count: 4,
                        metadata: {
                            slideshow: {
                                slide_type: '-'
                            }
                        },
                        outputs: [
                            {
                                data: {
                                    'text/html': [
                                        '<div>\n',
                                        '<style scoped>\n',
                                        '    .dataframe tbody tr th:only-of-type {\n',
                                        '        vertical-align: middle;\n',
                                        '    }\n',
                                        '\n',
                                        '    .dataframe tbody tr th {\n',
                                        '        vertical-align: top;\n',
                                        '    }\n',
                                        '\n',
                                        '    .dataframe thead th {\n',
                                        '        text-align: right;\n',
                                        '    }\n',
                                        '</style>\n',
                                        '<table border=\'1\' class=\'dataframe\'>\n',
                                        '  <thead>\n',
                                        '    <tr style=\'text-align: right;\'>\n',
                                        '      <th></th>\n',
                                        '      <th>num_preg</th>\n',
                                        '      <th>glucose_conc</th>\n',
                                        '      <th>diastolic_bp</th>\n',
                                        '      <th>thickness</th>\n',
                                        '      <th>insulin</th>\n',
                                        '      <th>bmi</th>\n',
                                        '      <th>diab_pred</th>\n',
                                        '      <th>age</th>\n',
                                        '      <th>skin</th>\n',
                                        '      <th>diabetes</th>\n',
                                        '    </tr>\n',
                                        '  </thead>\n',
                                        '  <tbody>\n',
                                        '    <tr>\n',
                                        '      <th>0</th>\n',
                                        '      <td>6</td>\n',
                                        '      <td>148</td>\n',
                                        '      <td>72</td>\n',
                                        '      <td>35</td>\n',
                                        '      <td>0</td>\n',
                                        '      <td>33.6</td>\n',
                                        '      <td>0.627</td>\n',
                                        '      <td>50</td>\n',
                                        '      <td>1.3790</td>\n',
                                        '      <td>True</td>\n',
                                        '    </tr>\n',
                                        '    <tr>\n',
                                        '      <th>1</th>\n',
                                        '      <td>1</td>\n',
                                        '      <td>85</td>\n',
                                        '      <td>66</td>\n',
                                        '      <td>29</td>\n',
                                        '      <td>0</td>\n',
                                        '      <td>26.6</td>\n',
                                        '      <td>0.351</td>\n',
                                        '      <td>31</td>\n',
                                        '      <td>1.1426</td>\n',
                                        '      <td>False</td>\n',
                                        '    </tr>\n',
                                        '    <tr>\n',
                                        '      <th>2</th>\n',
                                        '      <td>8</td>\n',
                                        '      <td>183</td>\n',
                                        '      <td>64</td>\n',
                                        '      <td>0</td>\n',
                                        '      <td>0</td>\n',
                                        '      <td>23.3</td>\n',
                                        '      <td>0.672</td>\n',
                                        '      <td>32</td>\n',
                                        '      <td>0.0000</td>\n',
                                        '      <td>True</td>\n',
                                        '    </tr>\n',
                                        '    <tr>\n',
                                        '      <th>3</th>\n',
                                        '      <td>1</td>\n',
                                        '      <td>89</td>\n',
                                        '      <td>66</td>\n',
                                        '      <td>23</td>\n',
                                        '      <td>94</td>\n',
                                        '      <td>28.1</td>\n',
                                        '      <td>0.167</td>\n',
                                        '      <td>21</td>\n',
                                        '      <td>0.9062</td>\n',
                                        '      <td>False</td>\n',
                                        '    </tr>\n',
                                        '    <tr>\n',
                                        '      <th>4</th>\n',
                                        '      <td>0</td>\n',
                                        '      <td>137</td>\n',
                                        '      <td>40</td>\n',
                                        '      <td>35</td>\n',
                                        '      <td>168</td>\n',
                                        '      <td>43.1</td>\n',
                                        '      <td>2.288</td>\n',
                                        '      <td>33</td>\n',
                                        '      <td>1.3790</td>\n',
                                        '      <td>True</td>\n',
                                        '    </tr>\n',
                                        '  </tbody>\n',
                                        '</table>\n',
                                        '</div>'
                                    ],
                                    'text/plain': [
                                        '   num_preg  glucose_conc  diastolic_bp  thickness  insulin   bmi  diab_pred  \\\n',
                                        '0         6           148            72         35        0  33.6      0.627   \n',
                                        '1         1            85            66         29        0  26.6      0.351   \n',
                                        '2         8           183            64          0        0  23.3      0.672   \n',
                                        '3         1            89            66         23       94  28.1      0.167   \n',
                                        '4         0           137            40         35      168  43.1      2.288   \n',
                                        '\n',
                                        '   age    skin  diabetes  \n',
                                        '0   50  1.3790      True  \n',
                                        '1   31  1.1426     False  \n',
                                        '2   32  0.0000      True  \n',
                                        '3   21  0.9062     False  \n',
                                        '4   33  1.3790      True  '
                                    ]
                                },
                                execution_count: 4,
                                metadata: {},
                                output_type: 'execute_result'
                            }
                        ],
                        source: [
                            'df',
                            'df.head(5)'
                        ],
                        id: '1',
                        file: 'foo.py',
                        line: 1,
                        state: CellState.finished
                    },
                    {
                        cell_type: 'code',
                        execution_count: 1,
                        metadata: {},
                        outputs: [
                         {
                          ename: 'NameError',
                          evalue: 'name "df" is not defined',
                          output_type: 'error',
                          traceback: [
                           '\u001b[1;31m---------------------------------------------------------------------------\u001b[0m',
                           '\u001b[1;31mNameError\u001b[0m                                 Traceback (most recent call last)',
                           '\u001b[1;32m<ipython-input-1-00cf07b74dcd>\u001b[0m in \u001b[0;36m<module>\u001b[1;34m()\u001b[0m\n\u001b[1;32m----> 1\u001b[1;33m \u001b[0mdf\u001b[0m\u001b[1;33m\u001b[0m\u001b[0m\n\u001b[0m',
                           '\u001b[1;31mNameError\u001b[0m: name "df" is not defined'
                          ]
                         }
                        ],
                        source: [
                         'df'
                        ],
                        id: '2',
                        file: 'foo.py',
                        line: 1,
                        state: CellState.finished
                       },
                       {
                        cell_type: 'code',
                        execution_count: 1,
                        metadata: {},
                        outputs: [
                         {
                          ename: 'NameError',
                          evalue: 'name "df" is not defined',
                          output_type: 'error',
                          traceback: [
                           '\u001b[1;31m---------------------------------------------------------------------------\u001b[0m',
                           '\u001b[1;31mNameError\u001b[0m                                 Traceback (most recent call last)',
                           '\u001b[1;32m<ipython-input-1-00cf07b74dcd>\u001b[0m in \u001b[0;36m<module>\u001b[1;34m()\u001b[0m\n\u001b[1;32m----> 1\u001b[1;33m \u001b[0mdf\u001b[0m\u001b[1;33m\u001b[0m\u001b[0m\n\u001b[0m',
                           '\u001b[1;31mNameError\u001b[0m: name "df" is not defined'
                          ]
                         }
                        ],
                        source: [
                         'df'
                        ],
                        id: '2',
                        file: 'foo.py',
                        line: 1,
                        state: CellState.init
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

        const clearButtonImage = this.props.theme !== 'vscode-dark' ? './images/Cancel/Cancel_16xMD_vscode.svg' :
        './images/Cancel/Cancel_16xMD_vscode_dark.svg';
        const redoImage = this.props.theme !== 'vscode-dark' ? './images/Redo/Redo_16x_vscode.svg' :
        './images/Redo/Redo_16x_vscode_dark.svg';
        const undoImage = this.props.theme !== 'vscode-dark' ? './images/Undo/Undo_16x_vscode.svg' :
        './images/Undo/Undo_16x_vscode_dark.svg';
        const restartImage = this.props.theme !== 'vscode-dark' ? './images/Restart/Restart_grey_16x_vscode.svg' :
        './images/Restart/Restart_grey_16x_vscode_dark.svg';
        const saveAsImage = this.props.theme !== 'vscode-dark' ? './images/SaveAs/SaveAs_16x_vscode.svg' :
        './images/SaveAs/SaveAs_16x_vscode_dark.svg';

        return (
            <div className='main-panel'>
                <PostOffice messageHandlers={[this]} />
                <MenuBar theme={this.props.theme} stylePosition='top-fixed'>
                    <CellButton theme={this.props.theme} onClick={this.export} disabled={!this.canExport()} tooltip={getLocString('DataScience.export', 'Export as Jupyter Notebook')}>
                        <RelativeImage class='cell-button-image' path={saveAsImage}/>
                    </CellButton>
                    <CellButton theme={this.props.theme} onClick={this.restartKernel} tooltip={getLocString('DataScience.restartServer', 'Restart iPython Kernel')}>
                        <RelativeImage class='cell-button-image' path={restartImage}/>
                    </CellButton>
                    <CellButton theme={this.props.theme} onClick={this.undo} disabled={!this.canUndo()} tooltip={getLocString('DataScience.undo', 'Undo')}>
                        <RelativeImage class='cell-button-image' path={undoImage}/>
                    </CellButton>
                    <CellButton theme={this.props.theme} onClick={this.redo} disabled={!this.canRedo()} tooltip={getLocString('DataScience.redo', 'Redo')}>
                        <RelativeImage class='cell-button-image' path={redoImage}/>
                    </CellButton>
                    <CellButton theme={this.props.theme} onClick={this.clearAll} tooltip={getLocString('DataScience.clearAll', 'Delete All')}>
                        <RelativeImage class='cell-button-image' path={clearButtonImage}/>
                    </CellButton>
                </MenuBar>
                <div className='top-spacing'/>
                {this.renderCells()}
                <div ref={this.updateBottom} />
            </div>
        );
    }

    // tslint:disable-next-line:no-any
    public handleMessage = (msg: string, payload?: any) => {
        switch (msg) {
            case HistoryMessages.StartCell:
                this.addCell(payload);
                return true;

            case HistoryMessages.FinishCell:
                this.finishCell(payload);
                return true;

            default:
                break;
        }

        return false;
    }

    private renderCells = () => {
        return this.state.cells.map((cell: ICell, index: number) =>
            <ErrorBoundary key={index}>
                <Cell
                    cell={cell}
                    theme={this.props.theme}
                    gotoCode={() => this.gotoCellCode(index)}
                    delete={() => this.deleteCell(index)}/>
            </ErrorBoundary>
        );
    }

    private canExport = () => {
        return this.state.cells.length > 0 ;
    }

    private canRedo = () => {
        return this.state.redoStack.length > 0 ;
    }

    private canUndo = () => {
        return this.state.undoStack.length > 0 ;
    }

    private pushStack = (stack : ICell[][], cells : ICell[]) => {
        // Get the undo stack up to the maximum length
        const slicedUndo = stack.slice(0, min([stack.length, this.stackLimit]));

        // Combine this with our set of cells
        return [...slicedUndo, cells];
    }

    private gotoCellCode = (index: number) => {
        // Find our cell
        const cell = this.state.cells[index];

        // Send a message to the other side to jump to a particular cell
        PostOffice.sendMessage({ type: HistoryMessages.GotoCodeCell, payload: { file : cell.file, line: cell.line }});
    }

    private deleteCell = (index: number) => {
        // Update our state
        this.setState({
            cells: this.state.cells.filter((c : ICell, i: number) => {
                return i !== index;
            }),
            undoStack : this.pushStack(this.state.undoStack, this.state.cells),
            skipNextScroll: true,
            busy: false
        });
    }

    private clearAll = () => {
        // Update our state
        this.setState({
            cells: [],
            undoStack : this.pushStack(this.state.undoStack, this.state.cells),
            skipNextScroll: true,
            busy: false});
    }

    private redo = () => {
        // Pop one off of our redo stack and update our undo
        const cells = this.state.redoStack[this.state.redoStack.length - 1];
        const redoStack = this.state.redoStack.slice(0, this.state.redoStack.length - 1);
        const undoStack = this.pushStack(this.state.undoStack, this.state.cells);
        this.setState({
            cells: cells,
            undoStack: undoStack,
            redoStack: redoStack,
            skipNextScroll: true,
            busy: false
        });
    }

    private undo = () => {
        // Pop one off of our undo stack and update our redo
        const cells = this.state.undoStack[this.state.undoStack.length - 1];
        const undoStack = this.state.undoStack.slice(0, this.state.undoStack.length - 1);
        const redoStack = this.pushStack(this.state.redoStack, this.state.cells);
        this.setState({
            cells: cells,
            undoStack : undoStack,
            redoStack : redoStack,
            skipNextScroll : true,
            busy: false
        });

    }

    private restartKernel = () => {
        // Send a message to the other side to restart the kernel
        PostOffice.sendMessage({ type: HistoryMessages.RestartKernel, payload: { }});
    }

    private export = () => {
        // Send a message to the other side to export our current list
        PostOffice.sendMessage({ type: HistoryMessages.Export, payload: { contents: this.state.cells }});
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
    private addCell = (payload?: any) => {
        if (payload) {
            const cell = payload as ICell;
            if (cell) {
                this.setState({
                    cells: [...this.state.cells, cell],
                    undoStack : this.pushStack(this.state.undoStack, this.state.cells),
                    redoStack: this.state.redoStack,
                    skipNextScroll: false,
                    busy: false
                });
            }
        }
    }

    // tslint:disable-next-line:no-any
    private finishCell = (payload?: any) => {
        if (payload) {
            const cell = payload as ICell;
            if (cell) {

                // Find this cell in our current state
                const index = this.state.cells.findIndex((c : ICell) => c.id === cell.id);
                if (index >= 0) {
                    // Update this cell
                    this.state.cells[index] = cell;
                    this.forceUpdate();
                }
            }
        }
    }
}
