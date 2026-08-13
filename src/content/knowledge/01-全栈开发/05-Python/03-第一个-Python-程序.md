# Python（03） - 第一个 Python 程序

> 读完后，你应能解释“3.1 方式 1：跑文件（最常用，≈ node app.js）”，复现“3.2 方式 2：交互式 REPL（≈ 在终端敲 node 回车）”的最小实现，并用“3.3 方式 3：一行命令（≈ node -e "..."）”检查结果与失败边界。

> 写一个 HelloWorld，走通「怎么运行」全流程，然后搞懂 Python 最反直觉的一点：**没有花括号，靠缩进划分代码块**。

# 一、先给个锚点：Python ≈ Node，不像 Java

上一篇 Java 要先 `javac` 编译再 `java` 运行（两步）。Python 不用——它和 Node 一样是**解释型**语言，写完直接跑：

```
前端（Node）：   app.js   ──node app.js──→   直接运行   ✅ 一步
Python：        app.py   ──python app.py──→  直接运行   ✅ 一步
（Java 才要：    .java ──javac──→ .class ──java──→ 运行）
```

所以心智模型直接套 Node 就行：**有解释器、没有编译产物、改完即跑**。

**边界（哪里不一样）**：Node 的入口靠 `package.json` 的 `main` 字段或你 `node` 后面跟的文件；Python 没有这套，你 `python` 后面跟哪个 `.py` 文件，它就从那个文件**第一行开始从上往下执行**（没有强制的 main 入口，这点反而更像浏览器里的 `<script>`）。

---

# 二、你的第一行代码

新建文件 `hello.py`：

```python
# print 是内置函数，作用 = 往控制台打印一行（自带换行）
print("Hello, World!")
```

对照 JS：

| JavaScript | Python | 说明 |
|------------|--------|------|
| `console.log("Hello")` | `print("Hello")` | 打印到控制台 |
| `console.log` 是对象方法 | `print` 是内置函数 | Python 里它就是个全局函数，不挂在任何对象上 |

注意几个「少了什么」：

- **没有分号**：行尾不写 `;`（写了也不报错，但不符合习惯，没人这么写）
- **没有 `console` 这种宿主对象**：`print` 直接就能用
- **注释用 `#`**，不是 `//`（多行注释也没有 `/* */`，靠每行开头 `#`，详见下文）

---

# 三、三种运行方式（都试一遍）

## 3.1 方式 1：跑文件（最常用，≈ `node app.js`）

```bash
python hello.py
# 输出：Hello, World!
```

> 注意：有些系统里 `python` 指向老的 Python 2，要用 `python3 hello.py`。上一篇（01-环境配置）装好后，建议在虚拟环境里统一用 `python`。

## 3.2 方式 2：交互式 REPL（≈ 在终端敲 `node` 回车）

```bash
python
>>> print("hi")     # 敲一行执行一行，适合验证小语法
hi
>>> 1 + 1           # REPL 会直接回显表达式的值，不用 print
2
>>> exit()          # 退出（或按 Ctrl+D）
```

REPL 和 Node 的交互模式体验几乎一样：即时试错、查 API 行为很方便。

## 3.3 方式 3：一行命令（≈ `node -e "..."`）

```bash
python -c "print('一次性脚本')"
```

---

# 四、本篇重点：缩进即代码块（最该掰清楚的地方）

JS 用 `{}` 划分代码块，Python **直接用缩进**。块的开头用冒号 `:`，下一行往里缩进，缩进相同的连续若干行就是同一个块。

并排看同一段逻辑：

```javascript
// JavaScript：花括号划块，缩进只是好看
function greet(name) {
  if (name) {
    console.log("Hello, " + name);
  } else {
    console.log("Hello, stranger");
  }
}
```

```python
# Python：冒号 + 缩进划块，没有花括号
# 函数 greet：根据是否传入名字打印不同问候语
# 参数 name：要问候的名字，可能为空字符串
def greet(name):
    if name:                       # 分支：传了名字
        print("Hello, " + name)
    else:                          # 分支：名字为空，用默认问候
        print("Hello, stranger")
```

要点拆解：

1. **冒号 `:` 是「块要开始了」的信号**：`def`、`if`、`else`、`for`、`while`、`class` 等行尾都要加冒号，忘了直接语法报错。
2. **缩进就是花括号**：往里缩一级 = 进入块，回到外层缩进 = 块结束。Python 不需要、也没有结束符（没有 `}`、没有 `end`）。
3. **同一块里缩进必须完全一致**：多一个空格、少一个空格都报 `IndentationError`。

> 类比一句话：你写 JS 时为了好看而做的缩进，在 Python 里**从「装饰」升级成了「语法」**——缩进错了 = 程序错了。

## 4.1 缩进用几个空格？

官方规范（PEP 8）：**用 4 个空格**，不要用 Tab。理由是 Tab 在不同编辑器里宽度不一，团队协作容易乱。把编辑器设成「按 Tab 键自动转 4 空格」即可（VS Code 默认就是这样）。

---

# 五、再补几个「和 JS 不一样」的小点

## 5.1 变量不用声明关键字

```javascript
let count = 0;        // JS：必须 let/const/var
const name = "imber";
```

```python
count = 0             # 变量 count：计数器，存当前计数，直接赋值即声明
name = "imber"        # 变量 name：用户名字符串
```

Python 没有 `let/const`，**直接赋值就创建变量**。没有内置的「常量」语法，约定用全大写变量名表示「别改它」（如 `MAX_SIZE = 100`），但语言层面拦不住你改。

## 5.2 多行注释靠多行 `#`

```python
# Python 没有 /* */ 这种块注释
# 多行说明就一行一个 #
# 这样写
```

（你会看到三引号 `"""..."""` 也常被当多行注释用，但它本质是「字符串」，正式用途是函数/模块的文档说明，后面学函数时再讲。）

## 5.3 `print` 还能这样用

```python
print("a", "b", "c")          # 多个参数用空格连接 → 输出：a b c
print("no newline", end="")   # 参数 end：替换默认的换行符，这里设为空 → 不换行
print("x", "y", sep="-")      # 参数 sep：自定义分隔符 → 输出：x-y
```

`end` 和 `sep` 是 `print` 的关键字参数，平时不用管，知道能改即可。

---

# 六、程序入口：`if __name__ == "__main__"`

你迟早会在别人代码里看到这一坨，先混个脸熟：

```python
# 函数 main：把「直接运行时才该跑的逻辑」收拢到一处
def main():
    print("程序启动")

# 分支：仅当本文件被「直接运行」时才执行 main()
# 被别的文件 import 时，__name__ 不是 "__main__"，这里就不会触发
if __name__ == "__main__":
    main()
```

类比 Node：

| Node | Python | 含义 |
|------|--------|------|
| `require.main === module` | `__name__ == "__main__"` | 判断「我是被直接运行，还是被别人 import」 |
| 直接 `node a.js` 时成立 | 直接 `python a.py` 时成立 | 只有当前入口文件才进这个分支 |

**为什么要这么写？** 因为 Python 文件被 `import` 时，会把整个文件**从头到尾执行一遍**（其实 JS 模块被 import 时也会执行模块体里的副作用代码，道理一样，所以 Node 才有 `require.main === module` 这种判断）。如果你把可执行逻辑裸写在文件里，别人一 import 你的文件，那些逻辑就会被意外触发。用这个 `if` 包起来，就能区分「直接跑」和「被当模块引用」两种场景。

> 入门阶段：单文件小脚本可以不写它，直接裸写 `print(...)` 也能跑。等开始拆模块（08 篇）时再回来体会它的必要性。

---

# 七、新手最容易踩的坑

| 坑 | 报错/现象 | 正确做法 |
|----|-----------|----------|
| Tab 和空格混用 | `TabError` / 缩进看着对其实错 | 统一用 4 空格，编辑器开「Tab 转空格」 |
| 块开头忘了冒号 `:` | `SyntaxError` | `if/for/def/class` 行尾都要 `:` |
| 习惯性写 `{}` 包代码块 | 逻辑不对或报错 | 用缩进，不用花括号 |
| 缩进多一格少一格 | `IndentationError` | 同一块缩进必须完全相同 |
| 用了 `let/const` | `SyntaxError` | 直接 `x = 1`，没有声明关键字 |
| 用 `//` 写注释 | `SyntaxError` | 注释用 `#`（`//` 在 Python 里是整除运算符） |

---

# 八、总结

这一篇你跑通了 Python 的 HelloWorld，记住几件事就够了：

- Python 像 Node，**写完直接 `python xx.py` 跑**，没有编译步骤
- `print()` ≈ `console.log()`，但它是个**内置函数**，且**没有分号**
- **缩进 = 代码块**：冒号 `:` 开块、缩进进块、回退出块，没有花括号
- 缩进规范：**4 个空格**，别用 Tab

✅ **该掌握**
- 三种运行方式：`python 文件`、REPL、`python -c`
- 缩进和冒号的配合规则
- `print` 的基本用法

⚠️ **易混淆**
- 缩进是**语法**不是排版，错一格就报错（最大的坑）
- 注释是 `#` 不是 `//`；`//` 在 Python 里是整除
- 变量不用 `let/const`，直接赋值；没有真正的常量
- `if __name__ == "__main__"` 现在只需脸熟，拆模块时再深究

下一篇：**03 - Python 与 JavaScript 对比**，用一张大对照表把变量、函数、类型快速过一遍。

## 参考资料

- [Python 3 文档](https://docs.python.org/3/)
- [FastAPI 文档](https://fastapi.tiangolo.com/)
