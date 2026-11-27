# Galois Field
<p class='text-xl'>
Galois Field又稱Finite Field，指的是在有限的集合F中，滿足Field的定義。
在集合F中，裡面的元素可以做加法與乘法的運算，其結果依然在集合F中，
加法與乘法必須滿足它們的公理與符合分配律。
</p>
<style>
/* 解除預設的半透明效果，並強制純白 */
p, li {
  color: #ffffff !important;
  opacity: 1 !important;
}
</style>

## $GF(p)$
### 定義
令$\;p\;$為質數，有一集合$\;F=\{0, 1, 2, ... , p-1\}$
定義兩種運算:<br/>
設$\;a, b \in F$
$$
a\oplus b = (a+b)\bmod p
\\
a\odot b = (a\times b)\bmod p
$$
代數結構
$$
GF(p) = (F,\oplus,\odot)
$$

---
---
### 以$\;GF(7)\;$為例子
#### $GF(7)$
#####  加法表：
<Transform :scale="0.9" origin="top center">

| $\oplus$ |  0  |  1  |  2  |  3  |  4  |  5  |  6  |
|:--------:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
|  **0**   |  <span class="fixed-red">0</span>  |  1  |  2  |  3  |  4  |  5  |  6  |
|  **1**   |  1  |  2  |  3  |  4  |  5  |  6  |  <span class="fixed-red">0</span>  |
|  **2**   |  2  |  3  |  4  |  5  |  6  |  <span class="fixed-red">0</span>  |  1  |
|  **3**   |  3  |  4  |  5  |  6  |  <span class="fixed-red">0</span>  |  1  |  2  |
|  **4**   |  4  |  5  |  6  |  <span class="fixed-red">0</span>  |  1  |  2  |  3  |
|  **5**   |  5  |  6  |  <span class="fixed-red">0</span>  |  1  |  2  |  3  |  4  |
|  **6**   |  6  |  <span class="fixed-red">0</span>  |  1  |  2  |  3  |  4  |  5  |

</Transform>

---
---
### 以$\;GF(7)\;$為例子
#### $GF(7)$
##### 乘法表：
<Transform :scale="0.9" origin="top center">

| $\odot$ |  0  |  1  |  2  |  3  |  4  |  5  |  6  |
|:-------:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
|  **0**  |  0  |  0  |  0  |  0  |  0  |  0  |  0  |
|  **1**  |  0  |  <span class="fixed-red">1</span>  |  2  |  3  |  4  |  5  |  6  |
|  **2**  |  0  |  2  |  4  |  6  |  <span class="fixed-red">1</span>  |  3  |  5  |
|  **3**  |  0  |  3  |  6  |  2  |  5  |  <span class="fixed-red">1</span>  |  4  |
|  **4**  |  0  |  4  |  <span class="fixed-red">1</span>  |  5  |  2  |  6  |  3  |
|  **5**  |  0  |  5  |  3  |  <span class="fixed-red">1</span>  |  6  |  4  |  2  |
|  **6**  |  0  |  6  |  5  |  4  |  3  |  2  |  <span class="fixed-red">1</span>  |

</Transform>

---
---
### 以$\;GF(7)\;$為例子
#### $GF(7)$
##### 單位元素：
* 加法：0
* 乘法：1

---
---
### 以$\;GF(7)\;$為例子
#### $GF(7)$
##### 加法反元素

<Transform :scale="0.9" origin="top center">

| 元素 $\;a$ | 加法反元素 $\;-a$ | 運算過程                     |
|:--------:|:---------------:|:---------------------------- |
|    0     |        0        | $(0 + 0) \bmod 7 = 0$        |
|    1     |        6        | $(1+6)\bmod7 = 7\bmod 7 = 0$ |
|    2     |        5        | $(2+5)\bmod7 = 7\bmod 7 = 0$ |
|    3     |        4        | $(3+4)\bmod7 = 7\bmod 7 = 0$ |
|    4     |        3        | $(4+3)\bmod7 = 7\bmod 7 = 0$ |
|    5     |        2        | $(5+2)\bmod7 = 7\bmod 7 = 0$ |
|    6     |        1        | $(6+1)\bmod7 = 7\bmod 7 = 0$ |
</Transform>

---
---
### 以$\;GF(7)\;$為例子
#### $GF(7)$
##### 乘法反元素

<Transform :scale="0.9" origin="top center">

| 元素 $\;a\;$ | 乘法反元素 $\;a^{-1}$ | 運算過程                              |
|:--------:|:-------------------:|:------------------------------------- |
|    1     |          1          | $(1\times 1)\bmod 7 = 1 \bmod 7 = 1$  |
|    2     |          4          | $(2\times 4)\bmod 7 = 8 \bmod 7= 1$   |
|    3     |          5          | $(3\times 5)\bmod 7 = 15 \bmod 7 = 1$ |
|    4     |          2          | $(4\times 2)\bmod 7 = 8 \bmod 7 = 1$  |
|    5     |          3          | $(5\times 3)\bmod 7 = 15 \bmod 7 = 1$ |
|    6     |          6          | $(6\times 6)\bmod 7 = 36\bmod 7 = 1$  |

</Transform>

---

## $GF(p^n)$
### $GF(p)\;$上的多項式環：$\;GF(p)[x]$
設$\;GF(p) = \{0, 1, 2, ..., p-1\}$<br><br>
$GF(p)[x]$：
$$
GF(p)[x] = \left\{ \sum_{i=0}^n{a_ix^i}\;\middle|\; n \in \mathbb Z_{\ge0}, a_i \in GF(p)\right\}
$$
ex:
$$
GF(2)[x] = \{0,\ 1,\ x,\ 1+x,\ x+x^2\ , 1+x+x^2,\dots\}
$$

---
---
### $GF(p)\;$上的多項式環：$\;GF(p)[x]$
#### 定義運算
設$\;a(x) = \sum_{i=0}^n{a_ix^i},\; b(x)=\sum_{j=0}^m{b_jx^j}$
##### 加法
$$
\begin{aligned}
a(x)\oplus b(x) &= (a(x)+b(x))  \\
&= (\sum_{i=0}^{n} {(a_ix^i)} + \sum_{j=0}^m{b_jx^j})   &&\text{}\\
&= (\sum_{k=0}^{n+m} {(a_k\oplus b_k)x^k})  &&\text{同類項合併}\\
&=  \sum_{k=0}^{n+m} {((a_k\oplus b_k))x^k} 
\end{aligned}
$$

---
---
#### 定義運算
設$\;a(x) = \sum_{i=0}^n{a_ix^i},\; b(x)=\sum_{j=0}^m{b_jx^j}$
##### 乘法
$$
\begin{aligned}
f(x)g(x) &= \sum_{i=0}^n{a_ix^i} \times \sum_{j=0}^m{b_ix^j}\\
&= \sum_{k=0}^{m+n} \left(\sum_{i+j=k}(a_i\odot b_j) \right)x^k 
\end{aligned}
$$

---
---
### 多項式理想(ideal)
設$\;f(x)\in GF(p)[x],\; f(x)為非零多項式$
#### 定義$\;f(x)\;$生成的理想：
$$(f(x)) = \{f(x)q(x)\;|\; q(x) \in GF(p)[x]\}$$


---
---
### 多項式商環
定義等價關係
$$
a(x)\sim b(x)
\iff
f(x)\mid(a(x)-b(x))
$$
等價類定義為
$$
[a(x)] = a(x) + (f(x))
$$
因此
$$ 
\begin{aligned}
GF(p)[x]/(f(x)) &= \{a(x)\;|\; a(x) \in GF(p)[x]\}
\end{aligned} 
$$

---
---
### 多項式商環
為什麼可以用多項式的餘來表示?<br>
根據多項式除法：
$$
a(x)=q(x)f(x)+r(x)
$$
其中：
$$
\deg r(x)<\deg f(x)
$$
因為：
$$
a(x)-r(x)=q(x)f(x)
$$
所以：
$$
[a(x)]=[r(x)]
$$
這表示$\;GF(p)[x]/(f(x))\;$中的每個元素都可以用最高次方小於$\;f(x)\;$的多項式表示

---
---
### 多項式商環
若$\;f(x)\;$的最高次方項為$\;n\;$則
$$
\begin{aligned}
GF(p)[x]/(f(x)) &= \left\{\sum_{i=0}^{n-1}{a_ix^i \; \middle| \; a_i\in GF(p)}\right\} \\
&=\{a_0+a_1x^1+a_2x^2+...+a_{n-1}x^{n-1} \;|\;0 \le i < n, a_i \in GF(p)\}
\end{aligned}
$$
所以這個多項式商環總共有
$$
p^n
$$

---
---
### 不可約多項式
不可約多項式和質數一樣，都無法再拆成兩個元素相乘（不可約多項式無法拆成兩個多項式相乘）。所以不可約多項式會與$\;GF(p)[x]\;$中的所有元素互質。
我們可以在$\;GF(p)[x]\;$中選擇一個不可約多項式來建立理想(ideal)，來建立一個類似模$\;n\;$整數環的結構。<br><br>
通常選擇首項係數為$\;1\;$的不可約多項式。

---
---
### $GF(p^n)$
設$\;f(x) \in GF(p)[x],\; deg(f(x)) = n,\; f(x)\;$為不可約多項式
$$
\begin{aligned}
GF(p^n) &= GF(p)[x]/(f(x)) \\ \\
&=\left\{\sum_{i=0}^{n-1}{a_ix^i \;\middle|\; a_i\in GF(p)}\right\} \\ \\
&=\{a_0+a_1x^1+a_2x^2+...+a_{n-1}x^{n-1} \;|\; 0 \le i < n,\; a_i \in GF(p)\}
\end{aligned}
$$

---
---
#### 定義運算：
##### 加法
$$
\begin{aligned}
a(x)\oplus b(x) &=  \sum_{k=0}^{n+m} {((a_k\oplus b_k))x^k} 
\end{aligned}
$$

##### 乘法
1. 做國中學的多項式乘法
$$
\begin{aligned}
g(x) &= a(x)\odot b(x) \\
&= \sum_{k=0}^{m+n} \left(\sum_{i+j=k}(a_i\odot b_j) \right)x^k 
\end{aligned}
$$

2. 用不可約多項式取多項式$\;f(x)\;$乘法後的餘數
$$
h(x)=g(x) \bmod f(x)
$$

---
---
#### 檢查是否滿足體的公理

<Transform :scale="0.9" origin="top center">

| 性質 | 數學表示 | 簡單證明 |
|---|---|---|
| 加法封閉性（Closure） | $a\oplus b\in F$ | 兩個次數小於 $\;n\;$ 的多項式相加，結果仍小於 $\;n\;$ 次，且係數屬於 $\;GF(p)\;$。 |
| 加法結合律（Associativity） | $(a\oplus b)\oplus c=a\oplus(b\oplus c)$ | 因為 $\;GF(p)\;$ 的加法滿足結合律，所以多項式逐項相加也滿足結合律。 |
| 加法交換律（Commutativity） | $a\oplus b=b\oplus a$ | 因為 $\;GF(p)\;$ 的加法滿足交換律，所以多項式加法也滿足交換律。 |
| 加法單位元素（Identity） | $\exists 0\in F,\ a\oplus0=a$ | 零多項式 $\;0(x)=0\;$ 屬於 $\;F\;$，且任何多項式加上零多項式仍為自身。 |
| 加法反元素（Inverse） | $\forall a\in F,\ \exists(-a)\in F,\ a\oplus(-a)=0$ | 因為 $\;GF(p)\;$ 中每個係數都有加法反元素，所以將多項式的所有係數取反即可。 |
</Transform>
---
---
#### 檢查是否滿足體的公理

<Transform :scale="0.9" origin="top center">

| 性質 | 數學表示 | 簡單證明 |
|---|---|---|
| 乘法封閉性（Closure） | $a\odot b\in F$ | 多項式相乘後，對 $\;f(x)\;$ 取餘數，結果次數小於 $\;n\;$，因此仍屬於 $\;F\;$。 |
| 乘法結合律（Associativity） | $(a\odot b)\odot c=a\odot(b\odot c)$ | 多項式乘法滿足結合律，而模 $\;f(x)\;$ 的運算不改變此性質。 |
| 乘法交換律（Commutativity） | $a\odot b=b\odot a$ | 因為多項式乘法滿足交換律，所以取模後仍滿足交換律。 |
| 乘法單位元素（Identity） | $\exists 1\in F,\ a\odot1=a$ | 常數多項式 $\;1\;$ 屬於 $\;F\;$，且 $\;a(x)\cdot1=a(x)$。 |
| 乘法反元素（Inverse） | $\forall a\in F\setminus\{0\},\ \exists a^{-1}\in F,\ a\odot a^{-1}=1$ | 因為 $\;f(x)\;$ 不可約，所有非零且次數小於 $\;n\;$ 的多項式都與 $\;f(x)\;$ 互質，因此由 Bézout 等式可得乘法反元素。 |
</Transform>

---
---
#### 檢查是否滿足體的公理
| 性質 | 數學表示 | 簡單證明 |
|---|---|---|
| 左分配律 | $a\odot(b\oplus c)=(a\odot b)\oplus(a\odot c)$ | 多項式乘法對加法滿足分配律，模 $\;f(x)\;$ 後仍成立。 |
| 右分配律 | $(a\oplus b)\odot c=(a\odot c)\oplus(b\odot c)$ | 同樣由多項式的分配律成立。 |

---
---
#### 以$\;GF(3^2)\;$為例子
1. 選擇最高次方項為$\;n\;$的不可約多項式
有下列選擇：

| $\deg(f(x))=2$ |        $x$          ||| 是否為不可約 |
| ^^             |  $0$  |  $1$  |  $2$  |^^            |
|:--------------:|:-----:|:-----:|:-----:|:------------:|
|     $x^2$      |   0   |   1   |   1   |      否      |
|    $x^2+1$     |   1   |   2   |   2   |    **是**    |
|    $x^2+2$     |   2   |   0   |   0   |      否      |
|    $x^2+x$     |   0   |   2   |   0   |      否      |
|   $x^2+x+1$    |   1   |   0   |   1   |      否      |

---
---
#### 以$\;GF(3^2)\;$為例子
1. 選擇最高次方項為$\;n\;$的不可約多項式
有下列選擇：

| $\deg(f(x))=2$ |        $x$          ||| 是否為不可約 |
| ^^             |  $0$  |  $1$  |  $2$  |^^            |
|:--------------:|:-----:|:-----:|:-----:|:------------:|
|   $x^2+x+2$    |   2   |   1   |   2   |    **是**    |
|    $x^2+2x$    |   0   |   0   |   2   |      否      |
|   $x^2+2x+1$   |   1   |   1   |   0   |      否      |
|   $x^2+2x+2$   |   2   |   2   |   1   |    **是**    |


選擇$\;f(x)=x^2+1\;$ 作為不可約多項式

---
---
#### 以$\;GF(3^2)\;$為例子
$$
\begin{aligned}
GF(3)[x]/f(x) = \{0,\; 1,\; 2,\; x,\; 1+x,\; 2+x,\; 2x,\; 1+2x,\; 2+2x\}
\end{aligned}
$$
因為$\;x\;$通常表示為變數，在這裡我們把$\;x\;$換成$\;\alpha\;$使集合中的多項式變成一種具體的元素
$$
\begin{aligned}
GF(3^2) = \{0,\; 1,\; 2,\; \alpha,\; 1+\alpha,\; 2+\alpha,\; 2\alpha,\; 1+2\alpha,\; 2+2\alpha\}
\end{aligned}
$$

---
---
##### 加法表

<Transform :scale="0.9" origin="top center">

| $\oplus$ | 0| 1 | 2| α| 1+α| 2+α|2α| 1+2α| 2+2α|
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **0** | <span class="fixed-red">0</span> | 1 | 2 | α | 1+α | 2+α | 2α | 1+2α | 2+2α |
| **1** | 1 | 2 | <span class="fixed-red">0</span> | 1+α | 2+α | α | 1+2α | 2+2α | 2α |
| **2** | 2 | <span class="fixed-red">0</span> | 1 | 2+α | α | 1+α | 2+2α | 2α | 1+2α |
| **α** | α | 1+α | 2+α | 2α | 1+2α | 2+2α | <span class="fixed-red">0</span> | 1 | 2 |
| **1+α** | 1+α | 2+α | α | 1+2α | 2+2α | 2α | 1 | 2 | <span class="fixed-red">0</span> |
| **2+α** | 2+α | α | 1+α | 2+2α | 2α | 1+2α | 2 | <span class="fixed-red">0</span> | 1 |
| **2α** | 2α | 1+2α | 2+2α | <span class="fixed-red">0</span> | 1 | 2 | α | 1+α | 2+α |
| **1+2α** | 1+2α | 2+2α | 2α | 1 | 2 | <span class="fixed-red">0</span> | 1+α | 2+α | α |
| **2+2α** | 2+2α | 2α | 1+2α | 2 | <span class="fixed-red">0</span> | 1 | 2+α | α | 1+α |
 </Transform>

---
---
##### 乘法表

<Transform :scale="0.9" origin="top center">

| $\odot$ | 0 | 1 | 2 | α | 1+α | 2+α | 2α | 1+2α | 2+2α |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **0** | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **1** | 0 | <span class="fixed-red">**1**</span> | 2 | α | 1+α | 2+α | 2α | 1+2α | 2+2α |
| **2** | 0 | 2 | <span class="fixed-red">**1**</span> | 2α | 2+2α | 1+2α | α | 2+α | 1+α |
| **α** | 0 | α | 2α | 2 | 2+α | 2+2α | <span class="fixed-red">**1**</span> | 1+α | 1+2α |
| **1+α** | 0 | 1+α | 2+2α | 2+α | 2α | <span class="fixed-red">**1**</span> | 1+2α | 2 | α |
| **2+α** | 0 | 2+α | 1+2α | 2+2α | <span class="fixed-red">**1**</span> | α | 1+α | 2α | 2 |
| **2α** | 0 | 2α | α | <span class="fixed-red">**1**</span> | 1+2α | 1+α | 2 | 2+2α | 2+α |
| **1+2α** | 0 | 1+2α | 2+α | 1+α | 2 | 2α | 2+2α | α | <span class="fixed-red">**1**</span> |
| **2+2α** | 0 | 2+2α | 1+α | 1+2α | α | 2 | 2+α | <span class="fixed-red">**1**</span> | 2α |

</Transform>
