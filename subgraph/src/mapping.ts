import { BigInt, Bytes, Address } from "@graphprotocol/graph-ts"
import {
  HuntCreated,
  HuntParticipated,
  CorrectSolution,
  IncorrectSolution,
  HuntSolved,
  RandomnessRequested,
  WinnerSelected,
  PrizeClaimed,
  NFTMinted,
  HuntClosed,
  HuntCancelled,
} from "../generated/TreasureHunt/TreasureHunt"
import {
  Hunt, Player, Solution, RandomnessRequest,
  Winner, PrizeClaim, NFT, GlobalStats,
} from "../generated/schema"

// ── Helpers ───────────────────────────────────────────────────────────────────

function getOrCreatePlayer(address: Bytes): Player {
  const id = address.toHexString().toLowerCase()
  let player = Player.load(id)
  if (!player) {
    player = new Player(id)
    player.wins        = BigInt.fromI32(0)
    player.huntsSolved = BigInt.fromI32(0)
    player.totalEarned = BigInt.fromI32(0)
    player.nftsOwned   = BigInt.fromI32(0)
  }
  return player
}

function getOrCreateGlobalStats(): GlobalStats {
  let stats = GlobalStats.load("global")
  if (!stats) {
    stats = new GlobalStats("global")
    stats.totalHunts        = BigInt.fromI32(0)
    stats.totalParticipants = BigInt.fromI32(0)
    stats.totalPrizeEth     = BigInt.fromI32(0)
    stats.totalNFTsMinted   = BigInt.fromI32(0)
    stats.totalWinners      = BigInt.fromI32(0)
  }
  return stats
}

// ── Event handlers ────────────────────────────────────────────────────────────

export function handleHuntCreated(event: HuntCreated): void {
  const hunt = new Hunt(event.params.huntId.toString())
  hunt.creator          = event.params.creator
  // The current contract has one answer per hunt; clueCount is retained for the UI schema.
  hunt.clueCount        = 1
  hunt.prize            = event.params.prize
  hunt.participantCount = BigInt.fromI32(0)
  hunt.correctCount     = BigInt.fromI32(0)
  hunt.createdAt        = event.block.timestamp
  hunt.endTime          = event.params.endTime
  hunt.huntType         = event.params.huntType === 0 ? "Race" : "MysteryDraw"
  hunt.status           = "Active"
  hunt.winner           = null
  hunt.vrfRequestId     = null
  hunt.prizeClaimed     = false
  hunt.save()

  const stats = getOrCreateGlobalStats()
  stats.totalHunts     = stats.totalHunts.plus(BigInt.fromI32(1))
  stats.totalPrizeEth  = stats.totalPrizeEth.plus(event.params.prize)
  stats.save()
}

export function handleHuntParticipated(event: HuntParticipated): void {
  const hunt = Hunt.load(event.params.huntId.toString())
  if (!hunt) return
  hunt.participantCount = hunt.participantCount.plus(BigInt.fromI32(1))
  hunt.save()

  const stats = getOrCreateGlobalStats()
  stats.totalParticipants = stats.totalParticipants.plus(BigInt.fromI32(1))
  stats.save()
}

export function handleCorrectSolution(event: CorrectSolution): void {
  const huntId = event.params.huntId.toString()
  const hunt   = Hunt.load(huntId)
  if (!hunt) return

  hunt.correctCount = hunt.correctCount.plus(BigInt.fromI32(1))
  hunt.save()

  const player = getOrCreatePlayer(event.params.player)
  player.huntsSolved = player.huntsSolved.plus(BigInt.fromI32(1))
  player.save()

  const solId  = event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  const sol    = new Solution(solId)
  sol.hunt      = huntId
  sol.player    = player.id
  sol.correct   = true
  sol.timestamp = event.block.timestamp
  sol.txHash    = event.transaction.hash
  sol.save()
}

export function handleIncorrectSolution(event: IncorrectSolution): void {
  const huntId = event.params.huntId.toString()
  const hunt   = Hunt.load(huntId)
  if (!hunt) return

  const player = getOrCreatePlayer(event.params.player)
  player.save()

  const solId  = event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  const sol    = new Solution(solId)
  sol.hunt      = huntId
  sol.player    = player.id
  sol.correct   = false
  sol.timestamp = event.block.timestamp
  sol.txHash    = event.transaction.hash
  sol.save()
}

export function handleHuntSolved(event: HuntSolved): void {
  const hunt = Hunt.load(event.params.huntId.toString())
  if (!hunt) return

  hunt.status = "Solved"
  hunt.winner = event.params.winner
  hunt.save()

  const player = getOrCreatePlayer(event.params.winner)
  player.wins = player.wins.plus(BigInt.fromI32(1))
  player.save()

  const winner = new Winner(event.params.huntId.toString())
  winner.hunt      = event.params.huntId.toString()
  winner.player    = player.id
  winner.prize     = event.params.prize
  winner.timestamp = event.block.timestamp
  winner.save()

  const stats = getOrCreateGlobalStats()
  stats.totalWinners = stats.totalWinners.plus(BigInt.fromI32(1))
  stats.save()
}

export function handleRandomnessRequested(event: RandomnessRequested): void {
  const huntId = event.params.huntId.toString()
  const reqId = event.params.requestId.toString()
  const req   = new RandomnessRequest(reqId)
  req.hunt      = huntId
  req.requestId = event.params.requestId
  req.fulfilled = false
  req.randomWord = null
  req.timestamp = event.block.timestamp
  req.save()

  const hunt = Hunt.load(huntId)
  if (hunt) {
    hunt.vrfRequestId = event.params.requestId
    hunt.save()
  }
}

export function handleWinnerSelected(event: WinnerSelected): void {
  const hunt = Hunt.load(event.params.huntId.toString())
  if (!hunt) return
  if (hunt.vrfRequestId === null) return

  const req = RandomnessRequest.load(hunt.vrfRequestId!.toString())
  if (req) {
    req.fulfilled  = true
    req.randomWord = event.params.randomWord
    req.save()
  }
}

export function handlePrizeClaimed(event: PrizeClaimed): void {
  const claimId = event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  const claim   = new PrizeClaim(claimId)
  claim.hunt      = event.params.huntId.toString()
  claim.winner    = event.params.winner.toHexString().toLowerCase()
  claim.amount    = event.params.amount
  claim.timestamp = event.block.timestamp
  claim.save()

  const player = getOrCreatePlayer(event.params.winner)
  player.totalEarned = player.totalEarned.plus(event.params.amount)
  player.save()

  const hunt = Hunt.load(event.params.huntId.toString())
  if (hunt) {
    hunt.prizeClaimed = true
    hunt.save()
  }
}

export function handleNFTMinted(event: NFTMinted): void {
  const huntId  = event.params.huntId.toString()
  const tokenId = event.params.tokenId.toString()

  const nft = new NFT(tokenId)
  nft.hunt     = huntId
  nft.winner   = event.params.winner.toHexString().toLowerCase()
  nft.mintedAt = event.block.timestamp
  nft.tokenId  = event.params.tokenId
  nft.save()

  const player = getOrCreatePlayer(event.params.winner)
  player.nftsOwned = player.nftsOwned.plus(BigInt.fromI32(1))
  player.save()

  const stats = getOrCreateGlobalStats()
  stats.totalNFTsMinted = stats.totalNFTsMinted.plus(BigInt.fromI32(1))
  stats.save()
}

export function handleHuntClosed(event: HuntClosed): void {
  const hunt = Hunt.load(event.params.huntId.toString())
  if (!hunt) return
  hunt.status = "Closed"
  hunt.save()
}

export function handleHuntCancelled(event: HuntCancelled): void {
  const hunt = Hunt.load(event.params.huntId.toString())
  if (!hunt) return
  hunt.status = "Cancelled"
  hunt.save()
}
