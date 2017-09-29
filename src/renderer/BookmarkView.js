const {ipcRenderer, clipboard, shell} = require('electron');

class BookmarkView {
    constructor() {
        this._btnHome = document.querySelector('#btn_home');
        this._btnGithub = document.querySelector('#btn_github');
        this._dataDom = document.querySelector('#data');

        this._bindDomEvent();
        this._bindIpcEvent();
    }

    _bindDomEvent() {
        this._btnHome.addEventListener('click', () => {
            this._changeType('home');
        });
        this._btnGithub.addEventListener('click', () => {
            this._changeType('github');
        });
        document.addEventListener('paste', () => {
            this._paste();
        });
    }

    _bindIpcEvent() {
        ipcRenderer.on('data', (event, data) => {
            console.log(data);
            this._dataDom.innerHTML = this._getHtml(data);
            this._setItemDom();
        });
    }

    _changeType(type) {
        // UI 변경
        if (type === 'home') {
            this._btnHome.classList.add('active');
            this._btnGithub.classList.remove('active');
        } else if (type === 'github') {
            this._btnHome.classList.remove('active');
            this._btnGithub.classList.add('active');
        }
        // Data 변경
        ipcRenderer.send('type', type);
    }

    _paste() {
        const text = clipboard.readText();
        ipcRenderer.send('paste', text);
    }

    _getHtml(data) {
        const html = data.map(item => {
            return `
                <li class="list-group-item">
                    <div class="media-body">
                        <strong><a href="#" class="clickLink">${item.url}</a></strong>
                        <p>
                            ${item.title}
                            <span class="icon icon-trash pull-right"></span>
                        </p>
                    </div>
                </li>
                `;
        });

        return html.join('');
    }

    _setItemDom() {
        const removeDoms = document.querySelectorAll('.icon-trash');
        removeDoms.forEach((removeDom, index) => {
            removeDom.addEventListener('click', () => {
                ipcRenderer.send('remove', index);
            });
        });

        const clickDoms = document.querySelectorAll('.clickLink');
        clickDoms.forEach(clickDom => {
            clickDom.addEventListener('click', e => {
                shell.openExternal(e.target.innerHTML);
            });
        });
    }
}

module.exports = {
    BookmarkView
}