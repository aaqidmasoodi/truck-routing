from routing.risk import RiskLevel


def test_levels_are_ordered_from_safest_to_worst() -> None:
    assert (
        RiskLevel.LOW < RiskLevel.MODERATE < RiskLevel.HIGH < RiskLevel.SEVERE < RiskLevel.NO_TRAVEL
    )


def test_label_is_human_readable() -> None:
    assert RiskLevel.NO_TRAVEL.label == "No Travel"
    assert RiskLevel.LOW.label == "Low"
