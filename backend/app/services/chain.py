"""Minimal read-only web3 client used to verify a hunt's on-chain creator.

We only ever need `getHunt(uint256)` from the TreasureHunt contract, so we
declare a tiny ABI fragment for it rather than importing the full contract
artifact.
"""
from functools import lru_cache
from typing import Any, Dict

from web3 import Web3

from app.config import get_settings

TREASURE_HUNT_ABI = [
    {
        "inputs": [{"internalType": "uint256", "name": "huntId", "type": "uint256"}],
        "name": "getHunt",
        "outputs": [
            {
                "components": [
                    {"internalType": "uint256", "name": "id", "type": "uint256"},
                    {"internalType": "address", "name": "creator", "type": "address"},
                    {"internalType": "uint256", "name": "clueCount", "type": "uint256"},
                    {"internalType": "uint256", "name": "prize", "type": "uint256"},
                    {"internalType": "uint256", "name": "participantCount", "type": "uint256"},
                    {"internalType": "uint256", "name": "correctCount", "type": "uint256"},
                    {"internalType": "uint256", "name": "createdAt", "type": "uint256"},
                    {"internalType": "uint256", "name": "endTime", "type": "uint256"},
                    {"internalType": "uint8", "name": "huntType", "type": "uint8"},
                    {"internalType": "uint8", "name": "status", "type": "uint8"},
                    {"internalType": "address", "name": "winner", "type": "address"},
                    {"internalType": "uint256", "name": "vrfRequestId", "type": "uint256"},
                    {"internalType": "bool", "name": "prizeClaimed", "type": "bool"},
                ],
                "internalType": "struct TreasureHunt.Hunt",
                "name": "",
                "type": "tuple",
            }
        ],
        "stateMutability": "view",
        "type": "function",
    }
]

HUNT_FIELDS = (
    "id",
    "creator",
    "clueCount",
    "prize",
    "participantCount",
    "correctCount",
    "createdAt",
    "endTime",
    "huntType",
    "status",
    "winner",
    "vrfRequestId",
    "prizeClaimed",
)


class ChainConfigError(RuntimeError):
    """Raised when the chain client is used without TREASURE_HUNT_ADDRESS configured."""


@lru_cache
def _get_web3() -> Web3:
    settings = get_settings()
    return Web3(Web3.HTTPProvider(settings.RPC_URL))


def _get_contract():
    settings = get_settings()
    if not settings.TREASURE_HUNT_ADDRESS:
        raise ChainConfigError(
            "TREASURE_HUNT_ADDRESS is not configured; cannot verify on-chain hunt creator."
        )
    w3 = _get_web3()
    return w3.eth.contract(
        address=Web3.to_checksum_address(settings.TREASURE_HUNT_ADDRESS),
        abi=TREASURE_HUNT_ABI,
    )


def get_hunt(hunt_id: int) -> Dict[str, Any]:
    """Read a hunt struct from chain and return it as a plain dict keyed by field name."""
    contract = _get_contract()
    result = contract.functions.getHunt(hunt_id).call()
    return dict(zip(HUNT_FIELDS, result))


def get_hunt_creator(hunt_id: int) -> str:
    """Return the checksummed on-chain creator address for a hunt."""
    hunt = get_hunt(hunt_id)
    return hunt["creator"]
