"""Private, durable storage for email-only waitlist signups."""

from __future__ import annotations

from contextlib import contextmanager
import errno
import fcntl
import json
import os
from pathlib import Path
import re
import stat
import tempfile
import threading
from collections.abc import Iterator

MAX_WAITLIST_ENTRIES = 5_000
MAX_WAITLIST_FILE_BYTES = 2 * 1024 * 1024
MAX_WAITLIST_EMAIL_LENGTH = 320
_LOCAL_PART = re.compile(r"^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$")
_DOMAIN_LABEL = re.compile(r"^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$")
_STORE_THREAD_LOCK = threading.RLock()


class WaitlistStoreError(RuntimeError):
    """The private waitlist store cannot safely accept a signup."""


class WaitlistStoreCorruptError(WaitlistStoreError):
    """The stored waitlist is invalid and must be repaired by an operator."""


class WaitlistStoreFullError(WaitlistStoreError):
    """The bounded waitlist reached its configured capacity."""


def normalize_waitlist_email(value: str) -> str:
    """Validate a practical email address and return its deduplication key."""
    email = value.strip()
    if len(email) < 3 or len(email) > MAX_WAITLIST_EMAIL_LENGTH or email.count("@") != 1:
        raise ValueError("invalid email address")

    local, domain = email.rsplit("@", 1)
    if (
        not local
        or len(local) > 64
        or local.startswith(".")
        or local.endswith(".")
        or ".." in local
        or not _LOCAL_PART.fullmatch(local)
    ):
        raise ValueError("invalid email address")

    try:
        ascii_domain = domain.encode("idna").decode("ascii").lower()
    except UnicodeError as error:
        raise ValueError("invalid email address") from error

    labels = ascii_domain.split(".")
    if (
        len(ascii_domain) > 255
        or len(labels) < 2
        or any(not _DOMAIN_LABEL.fullmatch(label) for label in labels)
    ):
        raise ValueError("invalid email address")

    normalized = f"{local.casefold()}@{ascii_domain}"
    if len(normalized) > MAX_WAITLIST_EMAIL_LENGTH:
        raise ValueError("invalid email address")
    return normalized


class WaitlistStore:
    """Store normalized addresses in a bounded, private JSON file."""

    def __init__(self, path: Path | str) -> None:
        self.path = Path(path)

    def add(self, email: str) -> bool:
        """Persist an address, returning false when it already exists."""
        normalized = normalize_waitlist_email(email)
        try:
            with self._exclusive():
                emails = self._load()
                if normalized in emails:
                    return False
                if len(emails) >= MAX_WAITLIST_ENTRIES:
                    raise WaitlistStoreFullError("waitlist is full")
                emails.append(normalized)
                self._save(emails)
                return True
        except WaitlistStoreError:
            raise
        except OSError as error:
            raise WaitlistStoreError("waitlist storage is unavailable") from error

    @contextmanager
    def _exclusive(self) -> Iterator[None]:
        """Lock updates across threads and processes."""
        with _STORE_THREAD_LOCK:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            lock_path = self.path.with_suffix(f"{self.path.suffix}.lock")
            lock_fd = os.open(
                lock_path,
                os.O_CREAT | os.O_RDWR | getattr(os, "O_NOFOLLOW", 0) | getattr(os, "O_NONBLOCK", 0),
                0o600,
            )
            with os.fdopen(lock_fd, "a+b") as lock_file:
                if not stat.S_ISREG(os.fstat(lock_file.fileno()).st_mode):
                    raise WaitlistStoreError("waitlist lock is invalid")
                os.fchmod(lock_file.fileno(), 0o600)
                fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX)
                try:
                    yield
                finally:
                    fcntl.flock(lock_file.fileno(), fcntl.LOCK_UN)

    def _load(self) -> list[str]:
        try:
            fd = os.open(
                self.path,
                os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0) | getattr(os, "O_NONBLOCK", 0),
            )
        except FileNotFoundError:
            return []
        except OSError as error:
            # A symlink or a non-regular file cannot be trusted as a store.
            if error.errno == errno.ELOOP:
                raise WaitlistStoreCorruptError("waitlist store is invalid") from error
            raise WaitlistStoreError("waitlist storage is unreadable") from error
        with os.fdopen(fd, "rb") as handle:
            file_stat = os.fstat(handle.fileno())
            if not stat.S_ISREG(file_stat.st_mode) or file_stat.st_size > MAX_WAITLIST_FILE_BYTES:
                raise WaitlistStoreCorruptError("waitlist store is invalid")
            try:
                os.fchmod(handle.fileno(), 0o600)
                raw = handle.read(MAX_WAITLIST_FILE_BYTES + 1)
            except OSError as error:
                raise WaitlistStoreError("waitlist storage is unreadable") from error
        if len(raw) > MAX_WAITLIST_FILE_BYTES:
            raise WaitlistStoreCorruptError("waitlist store is invalid")

        try:
            payload = json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as error:
            raise WaitlistStoreCorruptError("waitlist store is invalid") from error

        if (
            not isinstance(payload, dict)
            or set(payload) != {"version", "emails"}
            or type(payload.get("version")) is not int
            or payload.get("version") != 1
            or not isinstance(payload.get("emails"), list)
            or len(payload["emails"]) > MAX_WAITLIST_ENTRIES
        ):
            raise WaitlistStoreCorruptError("waitlist store is invalid")

        emails: list[str] = []
        seen: set[str] = set()
        for value in payload["emails"]:
            if not isinstance(value, str):
                raise WaitlistStoreCorruptError("waitlist store is invalid")
            try:
                normalized = normalize_waitlist_email(value)
            except ValueError as error:
                raise WaitlistStoreCorruptError("waitlist store is invalid") from error
            if normalized != value or normalized in seen:
                raise WaitlistStoreCorruptError("waitlist store is invalid")
            seen.add(normalized)
            emails.append(normalized)
        return emails

    def _save(self, emails: list[str]) -> None:
        payload = json.dumps(
            {"version": 1, "emails": emails},
            indent=2,
            sort_keys=True,
        ).encode("utf-8") + b"\n"
        if len(payload) > MAX_WAITLIST_FILE_BYTES:
            raise WaitlistStoreFullError("waitlist is full")

        fd, temp_name = tempfile.mkstemp(
            prefix=f".{self.path.name}.",
            suffix=".tmp",
            dir=self.path.parent,
        )
        temp_path = Path(temp_name)
        try:
            os.fchmod(fd, 0o600)
            with os.fdopen(fd, "wb") as handle:
                fd = -1
                handle.write(payload)
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(temp_path, self.path)
            directory_fd = os.open(self.path.parent, os.O_RDONLY)
            try:
                os.fsync(directory_fd)
            finally:
                os.close(directory_fd)
        except BaseException:
            if fd >= 0:
                os.close(fd)
            temp_path.unlink(missing_ok=True)
            raise
