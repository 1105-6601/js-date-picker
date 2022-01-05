# DatePickerの実装例

[![Build Status](https://app.travis-ci.com/1105-6601/js-date-picker.svg?branch=master)](https://app.travis-ci.com/1105-6601/js-date-picker)
[![GitHub tag](https://img.shields.io/github/tag/1105-6601/js-date-picker.svg?label=latest)](https://www.npmjs.com/package/@tkzo/js-date-picker)
[![Downloads](https://img.shields.io/npm/dm/js-date-picker)](https://www.npmjs.com/package/@tkzo/js-date-picker)
[![License](https://img.shields.io/github/license/1105-6601/js-date-picker)](https://www.npmjs.com/package/@tkzo/js-date-picker)

JavascriptのDatePickerの実装例です。

[デモ](https://1105-6601.github.io/js-date-picker/)

# インストール

```shell
npm i @tkzo/js-date-picker --save
```

# 使い方

1. スタイルをロードします。
    ```html
    <link rel="stylesheet" href="./date-picker.css">
    ```

2. Input要素を準備します。
    ```html
    <input type="text" name="date" readonly>
    ```

3. モジュールをインポート

   JavaScript
   ```javascript
   import { DatePicker } from './date-picker.js';
   ```
   
   TypeScript
   ```typescript
   import { DatePicker } from '@tkzo/js-date-picker';
   ```

5. 適用したいInput要素のセレクタを`DatePicker`のコンストラクタに渡してインスタンスを生成します。
    ```javascript
    // DatePickerを初期化
    const picker = new DatePicker('[name="date"]');
    // デフォルトの日付を設定する場合
    const defaultDate = new Date(2022, 3, 15);
    // Input要素へ値を反映したくない場合、第二引数に`false`を渡す
    picker.setDate(defaultDate, false);
    // 現在の日付を取得
    const currentDate = picker.getDate();
    ```
