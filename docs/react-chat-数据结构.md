# react-chat 现有数据结构说明

> 项目路径：`e:\kulan\template\react-chat`  
> 整理日期：2026-09-13  
> 说明：以当前代码实现为准（非 freeapp 原文）

---

## 0. 存储总览

| 介质 | 名称 / Key | 存什么 |
|------|------------|--------|
| **IndexedDB** | `KulanChatDB` (v1) | 聊天消息、记忆事实、记忆事件 |
| **LocalStorage** | `kulan.chat.character` | 角色卡 + 文风（含 `replyMode` / 旁白 / 输出契约） |
| **LocalStorage** | `kulan.chat.memory` | 记忆表 Markdown + 上下文轮数 |
| **LocalStorage** | `kulan.chat.config` | API / 模型配置 |
| **LocalStorage** | `kulan.chat.bg` | 聊天背景设置 |
| **LocalStorage** | `kulan.chat.gameplay` | 玩法四栏开关与自定义显示名 |

当前单聊联系人 ID 常量：`DEFAULT_CONTACT_ID = "default"`。

源码入口：

| 文件 | 职责 |
|------|------|
| `src/utils/idb.ts` | IndexedDB 打开与通用读写 |
| `src/utils/messageStore.ts` | 消息持久化（含 `gameplay`） |
| `src/utils/memoryDb.ts` | episodes / facts |
| `src/utils/memoryStorage.ts` | 记忆设置（LSStorage）+ Fact 基础类型 |
| `src/utils/memoryOps.ts` | 副模型 `<memory_ops>` / `<memory_diff>`；无 ops 时 `convertMemoryDiffToFacts` 旁路 |
| `src/utils/memoryRetrieval.ts` | 检索 query / 评分 / 去重 / 相关 facts 注入块 |
| `src/utils/characterStorage.ts` | 角色卡 |
| `src/utils/sceneMeta.ts` | 故事时间推进 + 页眉短调用 `<scene_meta>` |
| `src/utils/gameplayStorage.ts` | 玩法四栏设置 + 固定花体装饰线 |
| `src/utils/gameplayMeta.ts` | 剧情后串行二次调用 `<gameplay>` |
| `src/utils/configStorage.ts` | API 配置 |
| `src/utils/bgSettings.ts` | 背景 |
| `src/types.ts` | UI 消息类型 |

---

## 1. IndexedDB：`KulanChatDB`

### 1.1 Object Stores

| Store | keyPath | 索引 |
|-------|---------|------|
| `messages` | `id` | `contactId`, `createdAt` |
| `memoryEpisodes` | `id` | `contactId`, `createdAt` |
| `memoryFacts` | `id` | `contactId`, `status`, `subject`, `predicate`, `updatedAt` |
| `meta` | `key` | — |

### 1.2 `messages` → `StoredMessage`

运行时 UI 类型 `UiMessage`，落库时扩展为 `StoredMessage`。

```ts
// src/types.ts
type MessageRole = 'user' | 'assistant' | 'system'

interface MessageScene {
  time: string          // ISO；客户端：近 5 年随机，每轮对话后 +1～5 分钟
  location?: string
  people?: string       // 现场人物（可选）
  weather?: string      // 天气 / 环境氛围
  godComment?: string   // 上帝视角评价，约 10–30 字，暧昧吐槽感
}

interface UiMessage {
  id: string
  role: MessageRole
  content: string
  pending?: boolean   // 流式中，不落库
  error?: boolean
  /** 仅 assistant；展示在正文前，不进模型 history 的 content */
  scene?: MessageScene
  /** 仅 assistant；剧情后二次生成的玩法面板，落库 */
  gameplay?: MessageGameplay
  /** 玩法二次调用进行中，不落库 */
  gameplayLoading?: boolean
}

// src/utils/messageStore.ts
interface StoredMessage extends UiMessage {
  contactId: string   // 当前固定 "default"
  createdAt: number
}
```

**场景页眉：** 时间由客户端生成（近 5 年随机，每轮 +1～5 分钟）。地点 / 现场人物 / 天气 / 上帝视角评价由**另一次短调用**强制输出 `<scene_meta>` XML；与主剧情并行，**两者都完成后**再渲染（页眉在正文之上）。主剧情 system **不再**要求 `【页眉】` 行。开关见 `CharacterCard.sceneHeader`。`loadMessages` 须带回 `scene`。

**玩法面板：** 主剧情（及页眉）渲染完成后，若有启用栏且**非新鲜模式**，再**串行**短调用 `<gameplay>`；数据挂在该条助手消息上。消息下方四个 Tab（仅启用栏），点开看详情；花体装饰线固定、不交给模型。设置见 `kulan.chat.gameplay`。`loadMessages` 须带回 `gameplay`；`gameplayLoading` 不落库。**新鲜模式不调用玩法。**

**示例：**

```json
{
  "id": "1725960000000-abc123",
  "role": "assistant",
  "content": "……旁白正文……",
  "scene": {
    "time": "2023-08-14T13:36:00.000Z",
    "location": "便利店门口",
    "people": "贺之炀、你",
    "weather": "晚风微凉",
    "godComment": "确认关系后的第一秒，空气比合同还紧。"
  },
  "gameplay": {
    "status": {
      "outfit": "黑色短袖与工装裤",
      "action": "握着水瓶，眼神飘忽",
      "mood": "懵、强装镇定",
      "innerOs": "她刚说喜欢我？……",
      "affection": "0%",
      "aboutYou": "突然告白的同学"
    }
  },
  "contactId": "default",
  "createdAt": 1725960000000
}
```

**规则：**
- `pending === true` 的气泡不写入
- 保存时去掉 `gameplayLoading`；按 `contactId` 清空后整表重写该联系人消息

### 1.3 `memoryEpisodes` → `MemoryEpisode`

一轮副模型记忆更新对应一条 episode。

```ts
interface MemoryEpisode {
  id: string
  contactId: string
  type: 'memory_update'
  content: string          // 扁平化对话文本
  source:
    | 'secondary_model_memory_ops'
    | 'secondary_model_memory_diff'
    | 'manual'
  createdAt: number
  messageIds: string[]
  metadata?: Record<string, unknown>
}
```

**示例：**

```json
{
  "id": "episode_1725960001000_x7k2ab",
  "contactId": "default",
  "type": "memory_update",
  "content": "【最新对话记录】\n我：我住在朝阳，不吃香菜\n贺之炀：……\n",
  "source": "secondary_model_memory_ops",
  "createdAt": 1725960001000,
  "messageIds": [],
  "metadata": {
    "memoryOps": { "...": "见下文 MemoryOps" },
    "oldMemoryLength": 420
  }
}
```

### 1.4 `memoryFacts` → `IdbMemoryFact`

在 `MemoryFact` 基础上增加 IndexedDB 字段。

```ts
interface MemoryFact {
  id: string
  subject: string
  predicate: string
  object: string
  factText: string
  status: 'active' | 'inactive'
  confidence: number      // 0–1
  importance: number      // 0–1
  type?: string
  timeScope?: string
  createdAt: number
  updatedAt: number
}

interface IdbMemoryFact extends MemoryFact {
  contactId: string
  sourceEpisodeId?: string
  validFrom?: number
  validTo?: number | null
  metadata?: Record<string, unknown>
}
```

**常用 `type`：**  
`profile` | `current_state` | `past_event` | `future_plan` | `relationship` | `item` | `preference` | `emotional_core` | `other`

**常用 `timeScope`：**  
`current` | `long_term` | `past` | `future` | `temporary`

**示例：**

```json
{
  "id": "fact_1725960001200_p9qm",
  "contactId": "default",
  "subject": "小雨",
  "predicate": "dislikes",
  "object": "香菜",
  "factText": "小雨不吃香菜",
  "status": "active",
  "confidence": 0.95,
  "importance": 0.8,
  "type": "preference",
  "timeScope": "long_term",
  "createdAt": 1725960001200,
  "updatedAt": 1725960001200,
  "sourceEpisodeId": "episode_1725960001000_x7k2ab",
  "validFrom": 1725960001200,
  "validTo": null,
  "metadata": {
    "type": "preference",
    "timeScope": "long_term",
    "source": "memory_ops",
    "entities": []
  }
}
```

失效后：`status: "inactive"`，`validTo` 填时间戳；`metadata.invalidationReason` 可记原因。

### 1.5 `meta`

```ts
{ key: string, value: unknown }
```

预留键值元数据，当前业务可为空。

---

## 2. LocalStorage

### 2.1 角色卡 `kulan.chat.character` → `CharacterCard`

静态设定（文风 + 角色卡），**不是**长期记忆事实。

```ts
type ReplyMode = 'im_bubble' | 'immersive_novel'

interface CharacterCard {
  name: string
  personality: string      // 角色设定
  speakingStyle: string    // 对白腔（怎么说话；不写篇幅/结构）
  scenario: string         // 场景
  greeting: string         // 开场白预设；空会话注入首条助手消息（空则不注入）
  customPrompts: string    // 额外指令
  userName: string
  userPersona: string
  userAvatar: string       // https 或 data URL（不存 blob:）
  replyMode: ReplyMode     // 对话 vs 旁白+玩法
  narrativeStyle: string   // 旁白文风（仅 immersive_novel 注入）
  outputFormat: string     // 输出结构契约（仅 immersive_novel 注入）
  freshMode: boolean       // 新鲜模式开关（句末提示词来自 .env，不存卡内）
  memoryEngineEnabled: boolean
  /** 助手正文前场景页眉：总开关 + 各字段显隐（设置 → 文风与角色 → 文风） */
  sceneHeader: {
    enabled: boolean
    fields: {
      time: boolean
      location: boolean
      people: boolean
      weather: boolean
      godComment: boolean
    }
  }
}
```

**`replyMode`（输出文本）：**

| 值 | UI 文案 | 主模型输出 |
|----|---------|------------|
| `im_bubble` | 对话 | 口语短句，双边气泡 |
| `immersive_novel` | 旁白+玩法 | **右**用户气泡 · **左**无气泡叙事墙；英文双引号 `""` 对白高亮，旁白不加框 |

**`freshMode`（普通 ⇔ 新鲜）+ `.env` 提示词：**

| 项 | 说明 |
|----|------|
| `freshMode: false` | 普通：按气泡原文发给模型 |
| `freshMode: true` | 新鲜：API 用户消息 = `原文 + "\n\n" + VITE_FRESH_APPEND_PROMPT`；提示词为空则不追加；**气泡仍只存/显原文**；**不调用玩法二次生成** |
| `react-chat/.env` | `VITE_FRESH_APPEND_PROMPT=` 开发者自填；**界面不提供编辑**；改后需重启 Vite |

顶栏「模式」按钮打开面板可切换上述两套开关；**新鲜模式开启时该按钮呈纯黄色**。文风细则仍在「文风与角色」设置页。

**示例（节选，默认贺之炀为旁白+玩法、普通模式）：**

```json
{
  "name": "贺之炀",
  "personality": "北航航空航天工程系大二……",
  "speakingStyle": "对白短句、口语……称用户「老板」……",
  "scenario": "便利店门口确认关系后的日常私聊……",
  "customPrompts": "不要使用 markdown、列表或标题。不要 OOC。……",
  "userName": "我",
  "userPersona": "",
  "userAvatar": "https://...",
  "replyMode": "immersive_novel",
  "narrativeStyle": "第二人称「你」+ 第三人称跟随角色。先写被用户话击中的瞬间……",
  "outputFormat": "【输出模式】immersive_novel……",
  "freshMode": false
}
```

拼进主模型 system（`buildCharacterSystemPrompt`）：

- 公共：角色设定 / 场景 / 用户侧 / 额外指令  
- `im_bubble`：【文风】+ 短气泡尾句  
- `immersive_novel`：【对白腔】【旁白文风】【输出格式】+「只输出左侧叙事整段」说明；**不再**拼「不要旁白 / 短气泡」

用户消息拼装：`buildUserContentForApi(text, card)` 读取 `import.meta.env.VITE_FRESH_APPEND_PROMPT`（仅新鲜模式影响请求体，不影响落库 `messages`）。

文风契约与样例见项目 skill：`.cursor/skills/immersive-novel-style/`（与 `DEFAULT_*` 常量同步）。

旧 LocalStorage 缺新字段时，`loadCharacter` / `saveCharacter` 会用默认值补齐；**若存档完全没有 `replyMode` 字段，则视为旧版并回落 `im_bubble`**（全新安装仍默认 `immersive_novel`）。`replyMode` 非法字符串则规范化为 `immersive_novel`。`freshMode` 缺省为 `false`；旧存档里的 `freshPrompt` 字段忽略，改由 `.env` 提供。缺 `greeting` 时补默认开场白；若用户显式存空串则空会话不注入。

**开场白：** 消息列表为空且 `greeting` 非空时，`ChatPage` 注入一条 `role: 'assistant'` 消息（不调主模型）。已有历史消息时不覆盖。

### 2.2 记忆设置 `kulan.chat.memory` → `MemorySettings`

```ts
interface MemorySettings {
  contextMessageCount: number  // 上下文轮数，默认 30，范围约 4–200
  memoryTable: string          // Markdown 记忆表
  facts: MemoryFact[]          // 遗留字段；正式事实以 IndexedDB 为准
}
```

**说明：**  
迁移后 `facts` 以 `memoryFacts` store 为准；LocalStorage 里主要保留 `contextMessageCount` + `memoryTable`。副模型 `<memory_diff>` 会改写 `memoryTable`。

**记忆表模板分区：** `# 角色设定` / `# 用户设定` / `# 背景设定`，以及 `### 【现在】` `【未来】` `【过去】` `【重要物品】`。

### 2.3 API 配置 `kulan.chat.config` → `AppConfig`

```ts
type ProviderId =
  | 'deepseek' | 'openai' | 'siliconflow'
  | 'moonshot' | 'zhipu' | 'custom'

interface ApiConfig {
  providerId: ProviderId
  baseUrl: string
  apiKey: string
  model: string
  temperature: number
  topP: number
  maxTokens: number   // 主剧情单次 max_tokens，默认 5000，可在「切换模型」改
}
```

主模型聊天与副模型记忆整理共用同一套 API（副模型 temperature 更低，约 `0.1`）。

### 2.4 背景 `kulan.chat.bg` → `BgSettings`

```ts
type BgSource = 'default' | 'custom'
type BgAdjust = 'default' | 'immerse' | 'focus' | 'custom'

interface BgSettings {
  source: BgSource
  adjust: BgAdjust
  customUrl: string | null   // blob: 不持久化
}
```

### 2.5 玩法 `kulan.chat.gameplay` → `GameplaySettings`

设置入口：顶栏设置菜单 → **玩法**。

```ts
type GameplayPanelId = 'status' | 'phone' | 'social' | 'promises'

interface GameplayPanelConfig {
  enabled: boolean   // 关则不请求、不显示 Tab
  label: string      // 自定义显示名（默认：状态面板/手机动态/社交圈/约定）
}

type GameplaySettings = Record<GameplayPanelId, GameplayPanelConfig>
```

| id | 默认名 | 面板字段（中文展示） |
|----|--------|----------------------|
| `status` | 状态面板 | 穿搭 / 动作 / 心情 / 内心OS / 好感 / 关于你 |
| `phone` | 手机动态 | 通知 / 便签 / 搜索记录 |
| `social` | 社交圈 | 群聊 / 私信 |
| `promises` | 约定 | 待完成 / 已完成 |

四栏各有**固定**花体装饰线（`GAMEPLAY_DECORATIONS`），不交给模型生成。

---

## 3. 副模型交换结构（不直接落库的中间格式）

聊完一轮后，`runSecondaryMemoryUpdate` 请求同 API，解析：

### 3.1 `<memory_ops>` → `MemoryOps`

```ts
interface MemoryOps {
  entities?: Array<{
    name?: string
    type?: string
    aliases?: string[]
    description?: string
  }>
  facts_to_add?: Array<{
    subject?: string
    predicate?: string
    object?: string
    factText?: string
    type?: string
    timeScope?: string
    confidence?: number
    importance?: number
  }>
  facts_to_invalidate?: Array<{
    subject?: string
    predicate?: string
    reason?: string
  }>
}
```

流程：写 `memoryEpisode` → `applyMemoryOps` → 更新 `memoryFacts`。

### 3.2 `<memory_diff>` 

JSON 数组，打补丁到 Markdown 记忆表：

```json
[
  { "op": "update", "section": "现在", "key": "地点", "value": "朝阳" },
  { "op": "append", "section": "过去", "line": "| 小雨 | 告白不吃香菜 | 便利店 | 今晚 |" },
  { "op": "delete", "section": "现在", "keyword": "未知" }
]
```

**旁路与失效（对齐 freeapp）：**

1. 无论是否有 `memory_ops`，diff 都会 patch `memoryTable`。
2. `section === "未来"` 的 `delete` 会失效 future / promise / future_plan 类 facts（`invalidateFactsFromMemoryDiffDelete`）。
3. **仅当本轮没有成功应用 `memory_ops`** 时，`convertMemoryDiffToFacts` 把 update/append 转成 `memoryFacts` 写入 IndexedDB（兜底，避免只有表更新、结构化库空窗）。

### 3.3 主模型记忆检索（`memoryRetrieval.ts`）

| 项 | 行为 |
|----|------|
| query | `buildMemoryRetrievalQuery` = 本轮用户句 + 最近 4 条消息 |
| 评分 | `scoreMemoryFact`（词法命中 + type/timeScope 偏置 + 本轮短语加成 − 老化） |
| 过滤 | 聊天常用 `limit: 10`、`minScore: 7`；无达标时回退取正分 Top 8 |
| 去重 | 精确 S/P/O 键 + Jaccard 相似度 + 每 predicate 上限 2 |
| 注入块 | `buildRelevantMemoryFactsBlock` → `--- [相关结构化长期记忆] ---` + `<relevant_memory_facts>`（含类型 / 时间范围 / 可信度 / 重要性） |

### 3.4 玩法二次调用 `<gameplay>`（`gameplayMeta.ts`）

主剧情完成后串行请求（**新鲜模式跳过**）；system 只要求**当前启用**的子树。解析结果写入 `UiMessage.gameplay`。

```xml
<gameplay>
  <status>
    <outfit>…</outfit><action>…</action><mood>…</mood>
    <inner_os>…</inner_os><affection>…</affection><about_you>…</about_you>
  </status>
  <phone>
    <notices>…</notices><notes>…</notes><searches>…</searches>
  </phone>
  <social>
    <group_chat>…</group_chat><dm>…</dm>
  </social>
  <promises>
    <pending>…</pending><done>…</done>
  </promises>
</gameplay>
```

---

## 4. 数据流（简图）

```
用户发送
  │
  ├─ buildMemoryRetrievalQuery(用户句 + 近 4 条)
  │     → retrieveRelevantMemoryFacts(limit:10, minScore:7) → 注入 system
  ├─ 用 CharacterCard 按 replyMode 拼 system
  ├─ 按 contextMessageCount 截取最近 messages
  ├─ 若 freshMode：本轮用户 API 内容 = buildUserContentForApi（气泡仍存原文）
  ├─ 主模型流式回复 ∥ 场景页眉短调用 → 先渲染剧情(+页眉)
  ├─ （串行）普通模式且有启用玩法栏 → fetchGameplay → 消息下方 Tab；新鲜模式跳过
  │
  └─ 副模型（后台）
       ├─ <memory_ops> → episode + facts（IndexedDB）
       └─ <memory_diff> → 更新 memoryTable；无 ops 时旁路写 facts
```

---

## 5. Console 清理命令（可选）

```js
await new Promise((resolve, reject) => {
  const req = indexedDB.deleteDatabase('KulanChatDB')
  req.onsuccess = () => resolve(true)
  req.onerror = () => reject(req.error)
  req.onblocked = () => resolve('blocked')
})
Object.keys(localStorage)
  .filter((k) => k.startsWith('kulan.chat.'))
  .forEach((k) => localStorage.removeItem(k))
```

刷新页面后生效。

---

## 6. 与 freeapp 的对应关系

| freeapp | 本项目 |
|---------|--------|
| `WhaleLLTDB` | `KulanChatDB` |
| `contacts.messages` | store `messages` |
| `memoryEpisodes` / `memoryFacts` | 同名 store |
| `contact.personality` 等 | `CharacterCard`（LocalStorage） |
| `contact.memoryTableContent` | `MemorySettings.memoryTable` |
| 副模型 `memory_ops` / `memory_diff` | `memoryOps.ts` 同思路 |
| `convertMemoryDiffToFacts`（无 ops 兜底） | `memoryOps.convertMemoryDiffToFacts` |
| `retrieveRelevantMemoryFacts` / `scoreMemoryFact` | `memoryRetrieval.ts` |
| `buildRelevantMemoryFactsBlock` | 同文件富格式注入块 |
| — | 玩法四栏：`gameplayStorage` + `gameplayMeta`（本项目扩展） |

**刻意差异：** 记忆表不含「角色设定 / 用户设定」（人设在角色卡）；尚无多联系人、世界书 `worldBook[]`。

---

*文档随 `react-chat` 实现更新；以源码类型定义为准。*
