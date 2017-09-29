const {app, BrowserWindow, ipcMain, dialog, Tray, Menu, clipboard} = require('electron');
const url = require('url');
const path = require('path');
const fs = require('fs');
const request = require('superagent');
const getTitle = require('get-title');

const HTML = url.format({
    protocol: 'file',
    pathname: path.join(__dirname, '../../static/index.html')
});

const DATA_PATH = path.join(app.getPath('userData'), 'data.json');

class BookmarkApp {
    constructor() {
        this._tray = null;
        this._win = null;
        this._type = 'home';
        this._data = [];
        app.on('ready', this._ready.bind(this));
    }

    _ready() {
        // 데이터 로컬에서 가져오기
        this._initData();

        // 트레이 생성 및 메뉴 처리
        this._tray = new Tray(path.join(__dirname, '../../static/icon.png'));
        this._tray.setContextMenu(this._getTrayMenu());
        
        // 트레이의 이벤트에 함수 바인딩
        if (process.platform === 'darwin') {
            this._tray.on('right-click', this._toggle.bind(this));
        } else {
            this._tray.on('click', this._toggle.bind(this));
        }
        
        // 랜더러의 위치를 가져오기 위한 작업
        const bounds = this._tray.getBounds();
        
        // 랜더러 생성
        this._win = new BrowserWindow({
            width: 400,
            height: 400,
            x: Math.round(bounds.x - 200 + (bounds.width / 2)),
            y: (process.platform === 'darwin') ? bounds.y + bounds.height + 10 : bounds.y - 400 - 10,
            show: false,
            resizable: false,
            movable: false,
            acceptFirstMouse: true,
            frame: false
        });

        // 컨텐츠 로드
        this._win.loadURL(HTML);
        this._win.webContents.openDevTools();
        
        // 랜더러의 이벤트에 함수 바인딩
        this._win.once('ready-to-show', this._update.bind(this));
        if (process.platform === 'darwin') {
            this._win.on('blur', () => this._win.hide());
        }
        
        // ipc 이벤트에 함수 바인딩
        ipcMain.on('type', this._ipcType.bind(this));
        ipcMain.on('paste', this._ipcPaste.bind(this));
        ipcMain.on('remove', this._ipcRemove.bind(this));
    }

    _getTrayMenu() {
        return Menu.buildFromTemplate([
            {
                label: 'Open',
                click: () => {
                    this._win.show();
                }
            },
            {
                label: 'Save',
                submenu: [
                    {
                        label: 'Home',
                        click: () => {
                            this._saveUrl('home', clipboard.readText());
                        }
                    },
                    {
                        label: 'Github',
                        click: () => {
                            this._saveUrl('github', clipboard.readText());
                        }
                    }
                ]
            },
            {type: 'separator'},
            {
                label: 'Quit',
                click: () => {
                    app.quit();
                }
            }
        ]);
    }

    _update() {
        const updateData = this._data.filter(item => item.type === this._type);
        if (this._win !== null) {
            this._win.webContents.send('data', updateData);
        }
    }

    _ipcType(event, type) {
        this._type = type;
        this._update();
    }

    _ipcPaste(event, saveUrl) {
        this._saveUrl(this._type, saveUrl);
    }

    _ipcRemove(event, index) {
        this._removeUrl(index);
    }

    _update() {
        const updateData = this._data.filter(item => item.type === this._type);
        if (this._win !== null) {
            this._win.webContents.send('data', updateData);
        }
    }

    _saveUrl(type, saveUrl) {
        if (saveUrl.indexOf('http://') > -1 || saveUrl.indexOf('https://') > -1) {
            request.get(saveUrl)
                .end((err, response) => {
                    getTitle(response.res.text).then(title => {
                        this._data.push({type, url: saveUrl, title});
                        fs.writeFileSync(DATA_PATH, JSON.stringify(this._data));
    
                        if (this._type === type) {
                            this._update();
                        }
                    });
                });
        } else {
            dialog.showErrorBox('경고', 'url 이 아닌듯 합니다.');
        }
    }

    _removeUrl(index) {
        const currentData = this._data.filter((item, i) => {
            item.index = i;
            return item.type === this._type;
        });
    
        let removeId = null;
    
        currentData.forEach((item, i) => {
            if (i === index) {
                removeId = item.index;
            }
        });
    
        this._data.splice(removeId, 1);
        fs.writeFileSync(DATA_PATH, JSON.stringify(this._data));
        this._update();
    }

    _initData() {
        if (!fs.existsSync(DATA_PATH)) {
            fs.writeFileSync(DATA_PATH, JSON.stringify([]));
        }
        const fileData = JSON.parse(fs.readFileSync(DATA_PATH).toString());
        fileData.forEach(item => {
           this._data.push(item);
        });
    }

    _toggle() {
        if (this._win.isVisible()) {
            this._win.hide();
        } else {
            this._win.show();
        }
    }
}

module.exports = {
    BookmarkApp
};