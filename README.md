# front-tracker

---

## 📦 Install

```bash
npm install front-tracker
yarn add front-tracker
```

## 🔨 Usage

#### 配置监听项
```js
// tracker.ts
import Tracker from 'front-tracker';
/**
 * @project 项目标识符
 * @requestUrl 接口地址
 * @historyTracker history上报
 * @hashTracker hash上报
 * @domTracker 携带 data-tracker 点击事件上报
 * @jsError js 报错异常上报
 * @ajaxTracker 请求上报
*/
export const tracker = Tracker({
  project: '1',
  requestUrl: '',
  historyTracker: true,
  hashTracker: true,
  domTracker: true,
  jsError: true,
  ajaxTracker: true
})
```

#### 项目入口文件
```js
// app.js
import './tracker'
...
```

#### 使用`domTracker`
所有拥有`data-tracker`属性的dom，被点击时会触发上报
```jsx
function (){
  return (
    <button type='button' data-tracker='post message'> click me </button>
  )
}
```

#### 使用 自定义上报
```js
import { tracker } from './tracker'

tracker.customSendData({
  type: 'anyType',
  anyKey: 'anyString'
})
```