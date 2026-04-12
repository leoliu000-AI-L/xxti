#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse
import json
import pathlib
import random
import sys
import time
from typing import Any, Dict, List

import requests

ROOT = pathlib.Path(r"C:\Users\leoh0\sbti-rebuild")
CONFIG_PATH = pathlib.Path(r"C:\Users\leoh0\.config\opencode\opencode.json")
TRAE_CONFIG_PATH = pathlib.Path(r"C:\Users\leoh0\AppData\Roaming\Trae CN\User\mcp.json")
OUTPUT_DIR = ROOT / "generated"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
SESSION = requests.Session()
SESSION.trust_env = False

HEADSHOT_TAIL = (
    "单人头像特写，近景胸像，直视镜头或轻微侧视，五官压迫感强，"
    "表情冷感或带攻击性，发丝和配饰细节清楚，背景虚化但保留命格元素，"
    "国风仙侠与赛博修真混合风格，电影级打光，超清细节，强烈个性，1:1头像。"
)

PROMPTS: List[Dict[str, str]] = [
    {"code": "ASCN", "name": "飞升批", "prompt": "高冷傲慢的年轻天才男剑修，极简高阶法袍，飞升台冷光，克制而凌厉，展现出一种绝对的统治力。"},
    {"code": "SPNS", "name": "资源矿主", "prompt": "雍容华贵的仙门女总裁，金线法袍，储物戒与权限符印密集，淡笑，精于算计，像连情分都能做资产折现的女强人。"},
    {"code": "VSPR", "name": "门面仙君", "prompt": "绝美清冷的仙子，完美到像宗门宣传片大女主，白衣无瑕，眼神高冷审视，像礼貌看着别人塌房的高配门面。"},
    {"code": "DOMN", "name": "掌门候补", "prompt": "气场全开的霸道男掌门候补，黑金法袍，掌门令在手，稳定而高压，像不用发火也会让人先低头的上位者。"},
    {"code": "AURA", "name": "气运挂件", "prompt": "被命运偏爱的甜美少女修士，锦鲤体质，周身金色气运丝线，柔软外壳下带拿捏感，像总有人替她铺路的团宠。"},
    {"code": "NULL", "name": "塌房预警", "prompt": "高敏感阴郁男修，眼神常年防爆，像别人一句聊聊就能脑补出灭门事故的神经质青年。"},
    {"code": "RUSH", "name": "爆肝道君", "prompt": "熬夜过载的卷王男修，眼下青黑，法袍凌乱，背后满是计划符屏，像天劫来了都要先清待办的狂人。"},
    {"code": "GLMR", "name": "魅修本人", "prompt": "攻击性极强的绝世女魅修，华丽红纱，高级厌倦脸，波浪长发，擅长把暧昧变成统治术的危险魔女。"},
    {"code": "LINK", "name": "结契脑", "prompt": "情感浓度过高的偏执病娇女修，因果红线缠腕，眼神真又危险，像认定了就想把命绑一起的疯批美人。"},
    {"code": "NEST", "name": "洞府保姆", "prompt": "温柔治愈系的知心女医修，干净、冷静、略带疲惫，像你离了她生活系统会立刻崩塌的温柔师姐。"},
    {"code": "MASK", "name": "千面修士", "prompt": "戴着半脸赛博面具的神秘女修，多重面具与身份重影，温和与冷漠并存，像活成版本管理器的莫测女子。"},
    {"code": "OKOK", "name": "随缘老祖", "prompt": "洒脱不羁的逍遥女散仙，懒散、清醒、难被击穿，饮酒微笑，像什么都能混过去的随性女子。"},
    {"code": "MORI", "name": "黑莲散修", "prompt": "冷淡毒舌的黑衣女修，眼神厌世，像把人和世道一起看穿，别人一开口她心里就先骂完的冰冷少女。"},
    {"code": "JSTR", "name": "乐子真君", "prompt": "笑容讥讽的腹黑男修，摇扇看戏，围观欲强，像宗门塌房时第一时间开吃瓜直播的恶劣青年。"},
    {"code": "WHOA", "name": "挂王体质", "prompt": "吊儿郎当的男主面板修士，异常增幅特效缠身，松弛又离谱，像所有人都怀疑天道给他开后门的天选之子。"},
    {"code": "THNK", "name": "天机参谋", "prompt": "高智冷感军师男修，手持推演盘悬浮，理性到近乎无情，银边眼镜，像一开口就把整盘局拆穿的禁欲系学者。"},
    {"code": "DUST", "name": "厌世剑修", "prompt": "风雪中的冷硬男剑修，旧伤、灰黑剑袍、低温眼神，像一句废话都懒得多听的孤独剑客。"},
    {"code": "SLPR", "name": "躺平灵根", "prompt": "慵懒随性的女修士，半废不废的摆烂感，疲惫、松垮、拖延感明显，像明明还能救却总想等会再说的宅女。"},
    {"code": "VOID", "name": "贫穷器修", "prompt": "穷得很具体的现实主义落魄男器修，旧工具、精明眼神，像看你一眼就知道你消费观有病的理工男。"},
    {"code": "MONK", "name": "电子苦修僧", "prompt": "清冷禁欲的盲眼男修，静音结界环绕，疏离淡漠，像把群聊免打扰当核心心法的苦行僧。"},
    {"code": "NPCD", "name": "边角料弟子", "prompt": "存在感低却敏感的透明人女弟子，局促、认真、容易受伤，像主角团背景里的沉默小师妹。"},
    {"code": "SOLO", "name": "独狼散仙", "prompt": "边界感极强的孤傲男散仙，透明结界护身，面无表情，像别人一靠近就先拉警报的独行侠。"},
    {"code": "WILD", "name": "荒野邪修", "prompt": "野性外溢的危险男邪修，满身图腾，衣装失序，异化感强，像根本没打算和文明社会好好相处的狂徒。"},
    {"code": "DEAD", "name": "空壳真君", "prompt": "银发如雪、毫无生气的空洞女修，苍白、空茫、抽离，像所有热闹都再也点不燃她的机械人偶。"},
    {"code": "IMFW", "name": "废灵根", "prompt": "脆弱楚楚可怜的小师妹，湿润眼神，薄防御，像一句玩笑都能回放三天的娇弱女修。"},
    {"code": "HHHH", "name": "天道乱码", "prompt": "五官被乱码和赛博义体覆盖的异变修士，雌雄莫辨，元素乱序，表情抽象，像把天机盘都算崩的活体 bug。"},
    {"code": "DRUNK", "name": "丹瘾魔修", "prompt": "被猛药和增幅反噬的赛博魔修，半人半机械，亢奋又空虚，瞳孔发亮，危险上头，像明知快炸还要再磕一口的疯子。"},
]


def load_mcp_url() -> str:
    config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    primary = config["mcp"]["速推AI"]["url"]
    if TRAE_CONFIG_PATH.exists():
        trae_config = json.loads(TRAE_CONFIG_PATH.read_text(encoding="utf-8"))
        fallback = trae_config.get("mcpServers", {}).get("suitui-ai", {}).get("url")
        if fallback:
            return fallback
    return primary


def init_session(url: str) -> str:
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {"name": "codex-xxti-avatar-batch", "version": "1.0"},
        },
    }
    last_error = None
    for attempt in range(3):
        try:
            response = SESSION.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=120)
            response.raise_for_status()
            session_id = response.headers.get("mcp-session-id") or response.headers.get("Mcp-Session-Id")
            if not session_id:
                raise RuntimeError("No MCP session id returned")
            return session_id
        except Exception as exc:
            last_error = exc
            if attempt < 2:
                time.sleep(2 + random.random() * 2)
    raise last_error


def call_tool(url: str, session_id: str, tool_name: str, arguments: Dict[str, Any], rpc_id: int) -> Dict[str, Any]:
    payload = {
        "jsonrpc": "2.0",
        "id": rpc_id,
        "method": "tools/call",
        "params": {"name": tool_name, "arguments": arguments},
    }
    headers = {"Content-Type": "application/json", "Mcp-Session-Id": session_id}
    last_error = None
    for attempt in range(4):
        try:
            response = SESSION.post(url, json=payload, headers=headers, timeout=120)
            response.raise_for_status()
            data = response.json()
            if "error" in data:
                raise RuntimeError(json.dumps(data["error"], ensure_ascii=False))
            result = data.get("result", {})
            if isinstance(result, dict) and "content" in result:
                content = result.get("content") or []
                if content and content[0].get("type") == "text":
                    text = content[0].get("text", "{}")
                    try:
                        return json.loads(text)
                    except json.JSONDecodeError:
                        return {"raw_text": text}
            return result
        except Exception as exc:
            last_error = exc
            if attempt < 3:
                time.sleep(2 + random.random() * 3)
    raise last_error


def build_prompt(entry: Dict[str, str]) -> str:
    return f"{entry['prompt']}{HEADSHOT_TAIL}"


def submit_batch(url: str, session_id: str, limit: int) -> List[Dict[str, Any]]:
    tasks = []
    selected = PROMPTS[:limit] if limit else PROMPTS
    for idx, entry in enumerate(selected, start=1):
        args = {
            "model": "fal-ai/flux-2/flash",
            "prompt": build_prompt(entry),
            "image_size": "square_hd",
        }
        try:
            result = call_tool(url, session_id, "generate", args, 1000 + idx)
            tasks.append(
                {
                    "code": entry["code"],
                    "name": entry["name"],
                    "prompt": args["prompt"],
                    "submit_result": result,
                    "task_id": result.get("task_id"),
                    "status": result.get("status", "submitted"),
                }
            )
            print(f"submitted {entry['code']} -> {result.get('task_id')}")
        except Exception as exc:
            tasks.append(
                {
                    "code": entry["code"],
                    "name": entry["name"],
                    "prompt": args["prompt"],
                    "submit_error": str(exc),
                    "task_id": None,
                    "status": "submit_error",
                }
            )
            print(f"submit failed {entry['code']} -> {exc}")
        time.sleep(1)
    return tasks


def submit_slice(url: str, session_id: str, start: int, count: int) -> List[Dict[str, Any]]:
    end = start + count if count else len(PROMPTS)
    selected = PROMPTS[start:end]
    tasks = []
    for idx, entry in enumerate(selected, start=1):
        args = {
            "model": "fal-ai/flux-2/flash",
            "prompt": build_prompt(entry),
            "image_size": "square_hd",
        }
        try:
            result = call_tool(url, session_id, "generate", args, 5000 + start + idx)
            task = {
                "code": entry["code"],
                "name": entry["name"],
                "prompt": args["prompt"],
                "submit_result": result,
                "task_id": result.get("task_id"),
                "status": result.get("status", "submitted"),
            }
            print(f"submitted {entry['code']} -> {result.get('task_id')}")
        except Exception as exc:
            task = {
                "code": entry["code"],
                "name": entry["name"],
                "prompt": args["prompt"],
                "submit_error": str(exc),
                "task_id": None,
                "status": "submit_error",
            }
            print(f"submit failed {entry['code']} -> {exc}")
        tasks.append(task)
        time.sleep(1)
    return tasks


def poll_tasks(url: str, session_id: str, tasks: List[Dict[str, Any]], rounds: int, interval: int) -> None:
    pending = {task["task_id"] for task in tasks if task.get("task_id")}
    for round_idx in range(rounds):
        if not pending:
            break
        print(f"poll round {round_idx + 1}, pending={len(pending)}")
        time.sleep(interval)
        for idx, task in enumerate(tasks, start=1):
            task_id = task.get("task_id")
            if not task_id or task_id not in pending:
                continue
            result = call_tool(url, session_id, "get_result", {"task_id": task_id}, 3000 + round_idx * 100 + idx)
            status = result.get("status", task.get("status"))
            task["status"] = status
            task["task_result"] = result
            print(f"  {task['code']} -> {status}")
            if status in {"completed", "failed"}:
                pending.remove(task_id)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=0, help="only submit the first N personas")
    parser.add_argument("--start", type=int, default=0, help="start index in prompt list")
    parser.add_argument("--count", type=int, default=0, help="number of prompts to submit from start")
    parser.add_argument("--poll-rounds", type=int, default=20)
    parser.add_argument("--poll-interval", type=int, default=15)
    parser.add_argument("--mcp-url", type=str, default="", help="override MCP url")
    args = parser.parse_args()

    url = args.mcp_url or load_mcp_url()
    session_id = init_session(url)
    if args.count or args.start:
        tasks = submit_slice(url, session_id, args.start, args.count)
    else:
        tasks = submit_batch(url, session_id, args.limit)
    poll_tasks(url, session_id, tasks, args.poll_rounds, args.poll_interval)

    suffix = f"_{args.start}_{args.count or len(tasks)}" if (args.count or args.start) else ""
    output_path = OUTPUT_DIR / f"xxti_avatar_tasks{suffix}.json"
    output_path.write_text(json.dumps(tasks, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"saved -> {output_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
