from lunar_comm_sim.core.physical_models import load_dust_gain_reference


def test_dust_reference_curve_is_monotonic():
    rows = load_dust_gain_reference("data/baselines/dust_gain_reference.csv")
    values = [row["reference_gain_loss_db"] for row in rows]

    assert values == sorted(values)
    assert values[-1] > values[0]
