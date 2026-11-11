set -e
cd /tmp/claude-0/-home-claude/21c0dae6-b055-5be0-9efe-188c940e0baa/scratchpad/work
python3 ../trim/build.py >/dev/null && python3 rework_v6.py >/dev/null && python3 rework_v7.py >/dev/null && python3 rework_v8.py
python3 rework_v9.py
python3 rework_v10.py
python3 rework_v11.py; python3 rework_v12.py
python3 rework_v13.py
python3 rework_v14.py
python3 rework_v15.py
