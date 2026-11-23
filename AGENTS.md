
## Blender 与 Web 3D 技能调用

开始涉及 Blender 建模、着色、植被、环境建筑或 3D 渲染调优的工作前，必须按下表先打开并应用相应的 SKILL.md。blender-skills 的路径以 .codex/skills/blender-skills/.cursor/skills 为根，使用本仓库安装目录或上级项目目录的同名安装。若只有 .claude 镜像则使用该镜像。blender-assembly 位于 .codex/skills/blender-assembly/SKILL.md，同样可从上级项目目录读取。遇到缺失技能时注明实际路径与影响。

| 任务 | 必读技能 |
|---|---|
| 人物建模、雕刻或绑定 | character-artist/SKILL.md、sculpting/SKILL.md、rigging/SKILL.md、blender-assembly/SKILL.md |
| 场景、建筑、植被、材质或画质 | environment-artist/SKILL.md、materials/SKILL.md、lighting/SKILL.md、blender-assembly/SKILL.md、[项目画面规范](.codex/skills/changzheng-web3d-lookdev/SKILL.md) |

按需读 archviz/SKILL.md、vegetation-artist/SKILL.md、uv-workflow/SKILL.md、texture-workflow/SKILL.md、lookdev/SKILL.md、rendering/SKILL.md、scene-assembly/SKILL.md 和 export-pipeline/SKILL.md。涉及 Blender-MCP 资产改动时，按装配技能运行 verify_bounds 和 verify_overlap，并提供多视角实机对比。最终汇报顶部列出「本轮实际调用的 Skill 列表」，只列本轮实际读取并用于执行的技能。
