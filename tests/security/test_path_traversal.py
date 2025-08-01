"""Tests for path traversal vulnerabilities."""

import pytest
from pathlib import Path
from unittest.mock import patch

from src.habits.repositories.json_storage import (
    JsonDayRepository,
    JsonUserConfigRepository,
)


class TestPathTraversalSecurity:
    """Test path traversal prevention in repositories."""

    def test_json_day_repository_prevents_path_traversal(self):
        """Test that JsonDayRepository prevents path traversal attacks."""
        with patch.object(
            JsonDayRepository, "_is_test_environment", return_value=False
        ):
            with pytest.raises(ValueError, match="Invalid data directory path"):
                JsonDayRepository("../../../etc")

    def test_json_day_repository_prevents_absolute_paths_outside_project(self):
        """Test that absolute paths outside project are rejected."""
        with patch.object(
            JsonDayRepository, "_is_test_environment", return_value=False
        ):
            with pytest.raises(
                ValueError, match="Data directory must be within the project directory"
            ):
                JsonDayRepository("/etc/passwd")

    def test_json_day_repository_prevents_dot_dot_traversal(self):
        """Test that .. traversal patterns are rejected."""
        with patch.object(
            JsonDayRepository, "_is_test_environment", return_value=False
        ):
            with pytest.raises(ValueError, match="Invalid data directory path"):
                JsonDayRepository("data/../../../etc")

    def test_json_user_config_repository_prevents_path_traversal(self):
        """Test that JsonUserConfigRepository prevents path traversal attacks."""
        with patch.object(
            JsonUserConfigRepository, "_is_test_environment", return_value=False
        ):
            with pytest.raises(ValueError, match="Invalid data directory path"):
                JsonUserConfigRepository("../../../etc")

    def test_json_user_config_repository_prevents_absolute_paths_outside_project(self):
        """Test that absolute paths outside project are rejected."""
        with patch.object(
            JsonUserConfigRepository, "_is_test_environment", return_value=False
        ):
            with pytest.raises(
                ValueError, match="Data directory must be within the project directory"
            ):
                JsonUserConfigRepository("/etc/passwd")

    def test_json_user_config_repository_prevents_dot_dot_traversal(self):
        """Test that .. traversal patterns are rejected."""
        with patch.object(
            JsonUserConfigRepository, "_is_test_environment", return_value=False
        ):
            with pytest.raises(ValueError, match="Invalid data directory path"):
                JsonUserConfigRepository("data/../../../etc")

    def test_valid_relative_paths_are_allowed(self):
        """Test that valid relative paths within project are allowed."""
        # This should not raise an exception
        repo = JsonDayRepository("test_data")
        assert repo.data_dir.name == "test_data"

        config_repo = JsonUserConfigRepository("config_data")
        assert config_repo.data_dir.name == "config_data"

    def test_current_directory_is_allowed(self):
        """Test that current directory and subdirectories are allowed."""
        # This should not raise an exception
        repo = JsonDayRepository(".")
        assert repo.data_dir.resolve() == Path.cwd().resolve()

        repo2 = JsonDayRepository("data/subdir")
        assert "subdir" in str(repo2.data_dir)
