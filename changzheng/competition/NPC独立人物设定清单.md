# 10 人独立剧情人物设定清单

按 12 章场景中 kind 为 npc 的锚点统计，使用 anchors.js 的 npcKey 规则，并与 anchors-map.json 核对完整 ID。锚点数表示剧情站位，同屏可见人数受场景状态、距离和取景影响。年龄、身高、体态与面貌为美术建议。

| npcKey | 姓名 | 身份 | 优先级 | 年龄 | 身高（m） | 体型 | 肤色与面部 | 服饰与磨损 | 出现章节 | 锚点数 |
|---|---|---|---|---:|---:|---|---|---|---|---:|
| he_wen | 何文 | 指导员 | P1核心 | 34 | 1.78 | 肩背端正，腰身偏薄 | 中等暖肤，眼下疲色、淡胡茬 | 灰绿棉布军装、布绑腿；领缘泛白、皮带孔起毛 | 第 1、2、3、4、5、6、7、8、9、10、11、12 章 | 30 |
| wang_gui | 王贵 | 老班长 | P1核心 | 41 | 1.70 | 肩宽、前臂粗壮 | 深暖肤，眉间纹、短硬胡茬 | 灰褐旧军装、布绑腿；肘补丁、裤脚积泥 | 第 1、2、3、4、6、7、8、9、10、11、12 章 | 22 |
| chen_xiaoman | 陈小满 | 青年战士 | P1核心 | 19 | 1.67 | 瘦长、肩窄 | 浅暖肤，颧鼻晒红、少胡须 | 偏灰军装略宽，布绑腿与草鞋；袖口磨白、鞋底磨薄 | 第 1、2、3、5、6、7、8、9、10、11、12 章 | 16 |
| medic_1 | 卫生员 | 随队救护 | P2次要 | 26 | 1.61 | 紧凑、肩略窄 | 浅棕肤，眼下浅纹 | 素布军衣、布质救护挎包；肩带摩擦、开口反复缝补 | 第 1、2、5、6、7、8、9、10、11、12 章 | 15 |
| logistics_1 | 后勤 | 后勤协作员 | P1核心 | 32 | 1.73 | 躯干厚实、小腿壮 | 暖褐肤，面颊晒斑、下巴薄胡茬 | 棕灰棉军衣、帆布包与布绑腿；肩缝磨白、手肘补布 | 第 1、2、3、4、5、6、7、8、9、10、11、12 章 | 19 |
| liaison_1 | 联络员 | 交通联络员 | P2次要 | 24 | 1.65 | 轻瘦、肩线窄 | 中性暖肤，鼻背晒红、眉尾浅疤 | 素布短衣、贴身布挎包；包扣周边磨损、衣襟起毛 | 第 2、3、4、6、8、9、10、11、12 章 | 14 |
| boatman_1 | 船工 | 渡口船工 | P2次要 | 39 | 1.74 | 肩宽、前臂粗壮 | 深褐肤，鼻梁晒红、眼角细纹 | 粗布短褂、卷裤脚；裤脚水渍、袖口毛边 | 第 4、5、6 章 | 8 |
| guide_1 | 向导 | 沿途领路人 | P2次要 | 36 | 1.68 | 精瘦、腿部结实 | 棕肤，风晒粗糙、眼角浅纹 | 土褐粗布衣、布腰带；膝部补缀、裤脚泥痕 | 第 9 章 | 2 |
| civilian_1 | 老乡 | 沿途群众与送行者 | P2次要 | 48 | 1.63 | 背微弓、手掌厚实 | 暖棕肤，额纹、面颊色差 | 地方素色粗布短褂、旧布鞋；袖口补丁、鞋尖磨损 | 第 1、11 章 | 2 |
| narrator | 旁白 | 史实解说 | 无需3D实体 | — | — | — | — | — | 第 1、2、3、4、5、6、7、8、9、10、11、12 章 | 23 |

何文、王贵、后勤是锚点最多的三名实体角色。旁白虽标作 npc 锚点，actors3d.js 的 hasModel 会排除 narrator，因此只保留剧情交互入口，3D 人物实体为零。

服饰以长征时期的布制被服、裹腿和因地取材修补为参考。各岗位的配色与磨损是美术设定。可查阅[天津市可移动革命文物名录](https://whly.tj.gov.cn/XWDTYXWZX6562/TZGGYXXGKX5995/202103/W020240718567344190939.pdf)中的 1935 年长征线布裹腿与皮鞋，以及[国防部的长征服装保障资料](https://www.mod.gov.cn/gfbw/gfjy_index/js_214151/16491478.html)。

## 完整 anchorId

| npcKey | 章节 | anchorId |
|---|---:|---|
| he_wen | 1 | `chapter-1/anchor-dialogue-01-01-he_wen`<br>`chapter-1/anchor-dialogue-01-04-he_wen` |
| he_wen | 2 | `chapter-2/anchor-dialogue-02-01-he_wen`<br>`chapter-2/anchor-dialogue-02-04-he_wen` |
| he_wen | 3 | `chapter-3/anchor-dialogue-03-01-he_wen`<br>`chapter-3/anchor-dialogue-03-03-he_wen`<br>`chapter-3/anchor-dialogue-03-06-he_wen`<br>`chapter-3/anchor-dialogue-03-04-he_wen` |
| he_wen | 4 | `chapter-4/anchor-dialogue-04-01-he_wen`<br>`chapter-4/anchor-dialogue-04-06-he_wen` |
| he_wen | 5 | `chapter-5/anchor-dialogue-05-04-he_wen` |
| he_wen | 6 | `chapter-6/anchor-dialogue-06-01-he_wen`<br>`chapter-6/anchor-dialogue-06-02-he_wen`<br>`chapter-6/anchor-dialogue-06-03-he_wen`<br>`chapter-6/anchor-dialogue-06-04-he_wen`<br>`chapter-6/anchor-dialogue-06-06-he_wen` |
| he_wen | 7 | `chapter-7/anchor-dialogue-07-02-he_wen`<br>`chapter-7/anchor-dialogue-07-03-he_wen`<br>`chapter-7/anchor-dialogue-07-05-he_wen` |
| he_wen | 8 | `chapter-8/anchor-dialogue-08-04-he_wen` |
| he_wen | 9 | `chapter-9/anchor-dialogue-09-04-he_wen` |
| he_wen | 10 | `chapter-10/anchor-dialogue-10-03-he_wen`<br>`chapter-10/anchor-dialogue-10-04-he_wen` |
| he_wen | 11 | `chapter-11/anchor-dialogue-11-01-he_wen`<br>`chapter-11/anchor-dialogue-11-04-he_wen`<br>`chapter-11/anchor-dialogue-11-06-he_wen` |
| he_wen | 12 | `chapter-12/anchor-dialogue-12-02-he_wen`<br>`chapter-12/anchor-dialogue-12-03-he_wen`<br>`chapter-12/anchor-dialogue-12-04-he_wen`<br>`chapter-12/anchor-dialogue-12-06-he_wen` |
| wang_gui | 1 | `chapter-1/anchor-dialogue-01-02-wang_gui`<br>`chapter-1/anchor-dialogue-01-05-wang_gui`<br>`chapter-1/anchor-dialogue-01-04-wang_gui` |
| wang_gui | 2 | `chapter-2/anchor-dialogue-02-04-wang_gui`<br>`chapter-2/anchor-dialogue-02-06-wang_gui` |
| wang_gui | 3 | `chapter-3/anchor-dialogue-03-05-wang_gui` |
| wang_gui | 4 | `chapter-4/anchor-dialogue-04-03-wang_gui` |
| wang_gui | 6 | `chapter-6/anchor-dialogue-06-03-wang_gui` |
| wang_gui | 7 | `chapter-7/anchor-dialogue-07-01-wang_gui`<br>`chapter-7/anchor-dialogue-07-02-wang_gui`<br>`chapter-7/anchor-dialogue-07-03-wang_gui`<br>`chapter-7/anchor-dialogue-07-06-wang_gui` |
| wang_gui | 8 | `chapter-8/anchor-dialogue-08-01-wang_gui`<br>`chapter-8/anchor-dialogue-08-04-wang_gui` |
| wang_gui | 9 | `chapter-9/anchor-dialogue-09-02-wang_gui`<br>`chapter-9/anchor-dialogue-09-03-wang_gui`<br>`chapter-9/anchor-dialogue-09-06-wang_gui` |
| wang_gui | 10 | `chapter-10/anchor-dialogue-10-03-wang_gui`<br>`chapter-10/anchor-dialogue-10-04-wang_gui` |
| wang_gui | 11 | `chapter-11/anchor-dialogue-11-04-wang_gui` |
| wang_gui | 12 | `chapter-12/anchor-dialogue-12-02-wang_gui`<br>`chapter-12/anchor-dialogue-12-05-wang_gui` |
| chen_xiaoman | 1 | `chapter-1/anchor-dialogue-01-03-chen_xiaoman`<br>`chapter-1/anchor-dialogue-01-06-chen_xiaoman`<br>`chapter-1/anchor-dialogue-01-05-chen_xiaoman` |
| chen_xiaoman | 2 | `chapter-2/anchor-dialogue-02-05-chen_xiaoman` |
| chen_xiaoman | 3 | `chapter-3/anchor-dialogue-03-05-chen_xiaoman` |
| chen_xiaoman | 5 | `chapter-5/anchor-dialogue-05-05-chen_xiaoman` |
| chen_xiaoman | 6 | `chapter-6/anchor-dialogue-06-05-chen_xiaoman` |
| chen_xiaoman | 7 | `chapter-7/anchor-dialogue-07-04-chen_xiaoman` |
| chen_xiaoman | 8 | `chapter-8/anchor-dialogue-08-03-chen_xiaoman`<br>`chapter-8/anchor-dialogue-08-05-chen_xiaoman`<br>`chapter-8/anchor-dialogue-08-06-chen_xiaoman` |
| chen_xiaoman | 9 | `chapter-9/anchor-dialogue-09-03-chen_xiaoman`<br>`chapter-9/anchor-dialogue-09-05-chen_xiaoman` |
| chen_xiaoman | 10 | `chapter-10/anchor-dialogue-10-05-chen_xiaoman` |
| chen_xiaoman | 11 | `chapter-11/anchor-dialogue-11-05-chen_xiaoman` |
| chen_xiaoman | 12 | `chapter-12/anchor-dialogue-12-05-chen_xiaoman` |
| medic_1 | 1 | `chapter-1/anchor-dialogue-01-04-medic_1` |
| medic_1 | 2 | `chapter-2/anchor-dialogue-02-03-medic_1` |
| medic_1 | 5 | `chapter-5/anchor-dialogue-05-03-medic_1` |
| medic_1 | 6 | `chapter-6/anchor-dialogue-06-03-medic_1`<br>`chapter-6/anchor-dialogue-06-06-medic_1` |
| medic_1 | 7 | `chapter-7/anchor-dialogue-07-02-medic_1`<br>`chapter-7/anchor-dialogue-07-05-medic_1` |
| medic_1 | 8 | `chapter-8/anchor-dialogue-08-03-medic_1`<br>`chapter-8/anchor-dialogue-08-04-medic_1` |
| medic_1 | 9 | `chapter-9/anchor-dialogue-09-05-medic_1` |
| medic_1 | 10 | `chapter-10/anchor-dialogue-10-03-medic_1`<br>`chapter-10/anchor-dialogue-10-06-medic_1` |
| medic_1 | 11 | `chapter-11/anchor-dialogue-11-03-medic_1` |
| medic_1 | 12 | `chapter-12/anchor-dialogue-12-02-medic_1`<br>`chapter-12/anchor-dialogue-12-04-medic_1` |
| logistics_1 | 1 | `chapter-1/anchor-dialogue-01-02-logistics_1`<br>`chapter-1/anchor-dialogue-01-04-logistics_1` |
| logistics_1 | 2 | `chapter-2/anchor-dialogue-02-03-logistics_1` |
| logistics_1 | 3 | `chapter-3/anchor-dialogue-03-04-logistics_1` |
| logistics_1 | 4 | `chapter-4/anchor-dialogue-04-03-logistics_1` |
| logistics_1 | 5 | `chapter-5/anchor-dialogue-05-02-logistics_1`<br>`chapter-5/anchor-dialogue-05-03-logistics_1` |
| logistics_1 | 6 | `chapter-6/anchor-dialogue-06-02-logistics_1`<br>`chapter-6/anchor-dialogue-06-03-logistics_1`<br>`chapter-6/anchor-dialogue-06-06-logistics_1` |
| logistics_1 | 7 | `chapter-7/anchor-dialogue-07-02-logistics_1`<br>`chapter-7/anchor-dialogue-07-05-logistics_1` |
| logistics_1 | 8 | `chapter-8/anchor-dialogue-08-02-logistics_1`<br>`chapter-8/anchor-dialogue-08-04-logistics_1` |
| logistics_1 | 9 | `chapter-9/anchor-dialogue-09-02-logistics_1` |
| logistics_1 | 10 | `chapter-10/anchor-dialogue-10-03-logistics_1` |
| logistics_1 | 11 | `chapter-11/anchor-dialogue-11-03-logistics_1` |
| logistics_1 | 12 | `chapter-12/anchor-dialogue-12-02-logistics_1`<br>`chapter-12/anchor-dialogue-12-04-logistics_1` |
| liaison_1 | 2 | `chapter-2/anchor-dialogue-02-02-liaison_1`<br>`chapter-2/anchor-dialogue-02-05-liaison_1` |
| liaison_1 | 3 | `chapter-3/anchor-dialogue-03-02-liaison_1`<br>`chapter-3/anchor-dialogue-03-03-liaison_1` |
| liaison_1 | 4 | `chapter-4/anchor-dialogue-04-02-liaison_1`<br>`chapter-4/anchor-dialogue-04-05-liaison_1` |
| liaison_1 | 6 | `chapter-6/anchor-dialogue-06-04-liaison_1` |
| liaison_1 | 8 | `chapter-8/anchor-dialogue-08-05-liaison_1` |
| liaison_1 | 9 | `chapter-9/anchor-dialogue-09-01-liaison_1` |
| liaison_1 | 10 | `chapter-10/anchor-dialogue-10-01-liaison_1`<br>`chapter-10/anchor-dialogue-10-02-liaison_1`<br>`chapter-10/anchor-dialogue-10-05-liaison_1` |
| liaison_1 | 11 | `chapter-11/anchor-dialogue-11-02-liaison_1` |
| liaison_1 | 12 | `chapter-12/anchor-dialogue-12-02-liaison_1` |
| boatman_1 | 4 | `chapter-4/anchor-dialogue-04-04-boatman_1` |
| boatman_1 | 5 | `chapter-5/anchor-dialogue-05-01-boatman_1`<br>`chapter-5/anchor-dialogue-05-02-boatman_1`<br>`chapter-5/anchor-dialogue-05-04-boatman_1`<br>`chapter-5/anchor-dialogue-05-05-boatman_1`<br>`chapter-5/anchor-dialogue-05-06-boatman_1` |
| boatman_1 | 6 | `chapter-6/anchor-dialogue-06-02-boatman_1`<br>`chapter-6/anchor-dialogue-06-05-boatman_1` |
| guide_1 | 9 | `chapter-9/anchor-dialogue-09-01-guide_1`<br>`chapter-9/anchor-dialogue-09-04-guide_1` |
| civilian_1 | 1 | `chapter-1/anchor-dialogue-01-03-civilian_1` |
| civilian_1 | 11 | `chapter-11/anchor-dialogue-11-02-civilian_1` |
| narrator | 1 | `chapter-1/anchor-dialogue-01-06-narrator` |
| narrator | 2 | `chapter-2/anchor-dialogue-02-01-narrator`<br>`chapter-2/anchor-dialogue-02-06-narrator` |
| narrator | 3 | `chapter-3/anchor-dialogue-03-01-narrator`<br>`chapter-3/anchor-dialogue-03-06-narrator` |
| narrator | 4 | `chapter-4/anchor-dialogue-04-01-narrator`<br>`chapter-4/anchor-dialogue-04-06-narrator` |
| narrator | 5 | `chapter-5/anchor-dialogue-05-01-narrator`<br>`chapter-5/anchor-dialogue-05-06-narrator` |
| narrator | 6 | `chapter-6/anchor-dialogue-06-01-narrator`<br>`chapter-6/anchor-dialogue-06-06-narrator` |
| narrator | 7 | `chapter-7/anchor-dialogue-07-01-narrator`<br>`chapter-7/anchor-dialogue-07-06-narrator` |
| narrator | 8 | `chapter-8/anchor-dialogue-08-01-narrator`<br>`chapter-8/anchor-dialogue-08-06-narrator` |
| narrator | 9 | `chapter-9/anchor-dialogue-09-01-narrator`<br>`chapter-9/anchor-dialogue-09-06-narrator` |
| narrator | 10 | `chapter-10/anchor-dialogue-10-01-narrator`<br>`chapter-10/anchor-dialogue-10-06-narrator` |
| narrator | 11 | `chapter-11/anchor-dialogue-11-01-narrator`<br>`chapter-11/anchor-dialogue-11-06-narrator` |
| narrator | 12 | `chapter-12/anchor-dialogue-12-01-narrator`<br>`chapter-12/anchor-dialogue-12-06-narrator` |
