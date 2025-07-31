import pytest
from pydantic import ValidationError

from src.habits.domain.models.habit import Habit
from src.habits.domain.models.user_config import UserConfig


class TestUserConfig:
    def test_create_user_config_with_minimal_data(self):
        config = UserConfig(user_id="user-123")

        assert config.user_id == "user-123"
        assert config.habits == []

    def test_create_user_config_without_user_id_fails(self):
        with pytest.raises(ValidationError):
            UserConfig()

    def test_create_user_config_with_empty_user_id_fails(self):
        with pytest.raises(ValidationError):
            UserConfig(user_id="")

    def test_create_user_config_with_habits(self):
        habit1 = Habit(title="Exercise", description="Daily workout")
        habit2 = Habit(title="Read", description="Read for 30 minutes")

        config = UserConfig(user_id="user-123", habits=[habit1, habit2])

        assert config.user_id == "user-123"
        assert len(config.habits) == 2
        assert config.habits[0].title == "Exercise"
        assert config.habits[1].title == "Read"

    def test_user_config_serialization(self):
        habit = Habit(title="Meditate", description="10 minutes meditation")
        config = UserConfig(user_id="user-456", habits=[habit])

        serialized = config.model_dump()

        assert serialized["user_id"] == "user-456"
        assert len(serialized["habits"]) == 1
        assert serialized["habits"][0]["title"] == "Meditate"
        assert serialized["habits"][0]["description"] == "10 minutes meditation"

    def test_user_config_deserialization(self):
        data = {
            "user_id": "user-789",
            "habits": [
                {"title": "Water", "description": "Drink 8 glasses of water"},
                {"title": "Walk", "description": "10k steps daily"},
            ],
        }
        config = UserConfig.model_validate(data)

        assert config.user_id == "user-789"
        assert len(config.habits) == 2
        assert config.habits[0].title == "Water"
        assert config.habits[1].title == "Walk"
