# Welcome to [Slidev](https://github.com/slidevjs/slidev)!

To start the slide show:

- `npm install`
- `npm run dev`
- visit <http://localhost:3030>

Edit the [slides.md](./slides.md) to see the changes.

Learn more about Slidev at the [documentation](https://sli.dev/).
## 如何共編簡報？
### 抓github的資料 
1. 先從github複製專案
```
git clone git@github.com:F-YONG3721/galois-field.git
```

2. 進入專案
```
cd galois-field
```

3. 安裝依賴套件
```
pnpm install --frozen-lockfile
```

4. 確認使否可以執行
```
pnpm dev 
```

### 編輯檔案
#### 建立自己的git branch
1. 切換到main分支
```
git switch main
```

2. 取得新版本
```
git pull --ff-only origin main
```

3. 建立自己的分支
```
git switch -c 這裡填入分支名稱
```

4. 確認所在分支
```
git branch
```
結果應該是
```
  main
* 分支名稱
```
#### 修改slidev的簡報
pages/ 中有各章節的內容，在裡面編輯md檔

#### 將分支上傳github
```
# 第一次
git push -u origin 分支名稱

# 之後
git push
```




