// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';
import * as React from 'react';
import './App.css';

// commonJS mode for tsc produces JS that doesn't work well with the file loader. So just
// embed sources directly. This is also better for translation to vscode webview
export declare function resolvePath(relativePath: string): string;

export class App extends React.Component {
  public render() {
    return (
      <div className='App'>
        <header className='App-header'>
          <img src={resolvePath ? resolvePath('./logo.svg') : './logo.svg'} className='App-logo' alt='logo' />
          <h1 className='App-title'>Welcome to React</h1>
        </header>
        <p className='App-intro'>
          To get started, edit <code>src/App.tsx</code> and save to reload.
        </p>
      </div>
    );
  }
}
