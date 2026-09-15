/** 开场白前杂志风介绍卡（样式对齐 html/qingxin.html + idol 日记排版，文案为陆珩） */

import diary01 from '../assets/diary/diary-01-door.jpg'
import diary02 from '../assets/diary/diary-02-ride.jpg'
import diary03 from '../assets/diary/diary-03-sketch.jpg'
import diary04 from '../assets/diary/diary-04-water.jpg'

export interface IntroDiaryEntry {
  title: string
  body: string
  /** 拍立得小图 */
  image?: string
}

export const DEFAULT_INTRO = {
  latin: 'LUHENG',
  pinyin: 'LU HENG',
  englishHead: 'LOVE IS IN THE AIR',
  sep: '/// HEARTSTRINGS TUG ///',
  catchCut: '分寸',
  catchphrase: '我好像，做不到只把你当妹妹',
  idLabel: '珩',
  subtitle: '寄养表哥 / 24岁',
  look: '清瘦、墨黑短发、深棕眼、冷白皮',
  quoteLine: '把喜欢藏在行动里，安于以表哥身份守着边界。',
  diary: [
    {
      title: '名义上的表哥',
      body: '十四岁那年，他住进你家，成了名义上的表哥。你不带偏见地接纳了他。十年里他话少、守礼，把心意收在路过房门时短暂的驻足里——像一枚从不被拆开的信。',
      image: diary01,
    },
    {
      title: '不用逞强的年纪',
      body: '高中时期的他永远是旁人眼里懂事、自律、不需要安慰的优等生。一次月考心态崩盘，他整个人很低落，却习惯性装作没事。只有你看出来他不对劲，没有追问原因、没有劝他努力，只是安静陪他坐了一路回家。你让他第一次知道，在你面前，他不用永远紧绷、不用一直逞强。也是从那时起，他悄悄对你动了心。',
      image: diary02,
    },
    {
      title: '储物柜里的速写',
      body: '读研之后，他依旧不善言辞、习惯藏起情绪。实验室储物柜最底层，藏着一沓厚厚的草稿纸。正面是密密麻麻的公式推演，背面全是你的日常剪影：你低头吃饭的样子、趴在沙发上玩手机的侧脸、窗边发呆的模样。多年的心事无处安放，他唯一的宣泄方式，就是悄悄把你画下来，珍藏在只有自己知道的角落。',
      image: diary03,
    },
    {
      title: '偏爱从不声张',
      body: '从小到大，所有人都习惯他迁就别人、照顾别人。唯独你会下意识顾及他的情绪，记得他不爱热闹、偏爱安静，会在家人热闹聚餐时悄悄给他留一杯温水，会在他沉默时不强行搭话。你给的温柔从不刻意、不张扬，却是他十几年安稳心事的全部落点。',
      image: diary04,
    },
  ] as IntroDiaryEntry[],
}
