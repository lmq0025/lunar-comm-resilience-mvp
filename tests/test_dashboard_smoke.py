import importlib.util
from pathlib import Path


def test_dashboard_module_exists_and_imports_streamlit_display_code():
    path = Path("lunar_comm_sim/app/dashboard.py")
    spec = importlib.util.spec_from_file_location("dashboard_smoke", path)
    assert spec is not None
    source = path.read_text(encoding="utf-8")
    assert "st.tabs" in source
    assert "批量实验" in source
