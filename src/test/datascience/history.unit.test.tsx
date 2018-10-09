// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

// Custom module loader so we skip .css files that break non webpack wrapped compiles
var Module = require('module');

(function() {
    var origRequire = Module.prototype.require;
    var _require = function(context, path) {
        return origRequire.call(context, path);
    };

    var main = require.main;

    Module.prototype.require = function(path) {
        if (path.endsWith('.css')) {
            return '';
        }
        return _require(this, path);
    };
})();

import * as React from 'react';
import * as assert from 'assert';
import { mount } from 'enzyme';
import { JSDOM } from 'jsdom';
import * as TypeMoq from 'typemoq';
import { Disposable } from 'vscode';
import { PlatformService } from '../../client/common/platform/platformService';
import { IFileSystem, IPlatformService } from '../../client/common/platform/types';
import { IDisposableRegistry, ILogger } from '../../client/common/types';
import { JupyterServerProvider } from '../../client/datascience/jupyterServerProvider';
import { IJupyterServerProvider, IHistoryProvider } from '../../client/datascience/types';
import { IServiceContainer } from '../../client/ioc/types';
import { IWebPanel, IWebPanelProvider, IWebPanelMessageListener, IWebPanelMessage } from '../../client/common/application/types';
import { MainPanel } from '../../client/datascience/history-react/MainPanel';
import { HistoryProvider } from '../../client/datascience/historyProvider';
import { Cell } from '../../client/datascience/history-react/cell'
import { createDeferred, Deferred } from '../../utils/async';
import { waitForUpdate } from './reactHelpers'

declare var window : any;

suite('History output tests', () => {
    let fileSystem: TypeMoq.IMock<IFileSystem>;
    let logger: TypeMoq.IMock<ILogger>;
    let serviceContainer: TypeMoq.IMock<IServiceContainer>;
    const disposables: Disposable[] = [];
    let serverProvider: IJupyterServerProvider;
    let platformService : IPlatformService;
    let webPanelProvider : TypeMoq.IMock<IWebPanelProvider>;
    let webPanel : TypeMoq.IMock<IWebPanel>;
    let historyProvider : IHistoryProvider;

    function setUpDomEnvironment() {
        const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { pretendToBeVisual: true, url: 'http://localhost'});
        const { window } = dom;

        global['window'] = window;
        global['document'] = window.document;
        global['navigator'] = {
            userAgent: 'node.js',
        };
        copyProps(window, global);

        // Special case. Transform needs createRange
        global['document'].createRange = () => ({
            createContextualFragment: str => JSDOM.fragment(str)
          });

    }

    function copyProps(src, target) {
        const props = Object.getOwnPropertyNames(src)
            .filter(prop => typeof target[prop] === 'undefined');
        props.forEach((p : string) => {
            target[p] = src[p];
        });
    }

    setup(() => {
        serviceContainer = TypeMoq.Mock.ofType<IServiceContainer>();
        fileSystem = TypeMoq.Mock.ofType<IFileSystem>();
        platformService = new PlatformService();
        logger = TypeMoq.Mock.ofType<ILogger>();
        webPanelProvider = TypeMoq.Mock.ofType<IWebPanelProvider>();
        webPanel = TypeMoq.Mock.ofType<IWebPanel>();

        // Create our dummy window so we can interact with the DOM
        setUpDomEnvironment();

        fileSystem.setup(f => f.getFileHash(TypeMoq.It.isAny())).returns(() => Promise.resolve('42'));
        // tslint:disable-next-line:no-empty
        logger.setup(l => l.logInformation(TypeMoq.It.isAny())).returns((m) => {}); // console.log(m)); // REnable this to debug the server

        // Setup the webpanel provider so that it returns our dummy web panel. It will have to talk to our global JSDOM window so that the react components can link into it
        webPanelProvider.setup(p => p.create(TypeMoq.It.isAny(), TypeMoq.It.isAnyString(), TypeMoq.It.isAnyString())).returns(() => webPanel.object);
        webPanel.setup(p => p.postMessage(TypeMoq.It.isAny())).callback((m : IWebPanelMessage) => window.postMessage(m, '*')); // See JSDOM valid target origins

        serviceContainer.setup(c => c.get(TypeMoq.It.isValue(IDisposableRegistry), TypeMoq.It.isAny())).returns(() => disposables);
        serviceContainer.setup(c => c.get(TypeMoq.It.isValue(IFileSystem), TypeMoq.It.isAny())).returns(() => fileSystem.object);
        serviceContainer.setup(c => c.get(TypeMoq.It.isValue(ILogger), TypeMoq.It.isAny())).returns(() => logger.object);
        serviceContainer.setup(c => c.get(TypeMoq.It.isValue(IPlatformService), TypeMoq.It.isAny())).returns(() => platformService);
        serviceContainer.setup(c => c.get(TypeMoq.It.isValue(IJupyterServerProvider), TypeMoq.It.isAny())).returns(() => serverProvider);
        serviceContainer.setup(c => c.get(TypeMoq.It.isValue(IWebPanelProvider), TypeMoq.It.isAny())).returns(() => webPanelProvider.object);
        serverProvider = new JupyterServerProvider(serviceContainer.object);
        historyProvider = new HistoryProvider(serviceContainer.object);

    });

    teardown(() => {
        disposables.forEach(disposable => {
            if (disposable) {
                disposable.dispose();
            }
        });
    });

    test('Simple text', async () => {
        if (await serverProvider.isSupported()) {
            // Create our main panel and tie it into the JSDOM
            const wrapper = mount(<MainPanel skipDefault={true} />);

            // Get an update promise so we can wait for the add code
            const updatePromise = waitForUpdate(wrapper, MainPanel);

            // Send some code to the history and make sure it ends up in the html returned from our render
            const history = await historyProvider.getOrCreateHistory();
            await history.addCode('a=1\na', 'foo.py', 2);

            // Wait for the render to go through
            await updatePromise;

            const foundResult = wrapper.find('Cell');
            assert.equal(foundResult.length, 1, "Didn't find any cells being rendered");
        } else {
            // tslint:disable-next-line:no-console
            console.log('History test skipped, no Jupyter installed');
        }
    }).timeout(60000);

});
