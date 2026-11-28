import { WorkRing } from "./WorkRing";
import { Fragment, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type Dispatch, type DragEvent, type FormEvent, type MouseEvent, type ReactNode, type SetStateAction } from "react";
import type { BotWork } from "../state/useWork";
import { timeLabel } from "../state/chats";
import { keptColor, type Bot } from "../state/bots";
import { GlowContext } from "./GlowColors";
import {
  addToDraft,
  defaultRoomName,
  ROOM_MAX_MEMBERS,
  ROOM_MIN_MEMBERS,
  type Room,
} from "../state/groups";
import { starterFace } from "../state/starterFaces";
import { useAvatar, useFace } from "../state/useBots";
import { canDelete } from "../state/botActions";
import { matchesBot, sectionOpen } from "../state/botSearch";
import { HideListButton } from "./HideListButton";
import { Icon } from "./icons";
import { inviteRowLine, type RoomInvite } from "../state/roomInvites";
import { copyLine, copyRoom, isOver, type RoomCopy } from "../state/roomCopies";
import { draftLine, type RoomDraft } from "../state/roomDrafts";
import { lookPictureUrl, memberLook, type RoomLook, type RoomLooks } from "../state/roomLooks";
import { StarterFaceArt } from "./StarterFaceArt";
import { t } from "@shared/i18n";
import { keptHiddenBots, type HostBadge, type OtherBot, type OtherRoom } from "../state/keptHosts";
import { keptWorkKey } from "../state/keptHosts";
import { canAddFar, mixedBotKey, mixedTiles, neighbour, type MixedTile } from "../state/botOrder";
import type { OwnHermesBot } from "../state/roomDrafts";
import { HostBadgeMark } from "./CombinedDashboards";
import { botSideScroll } from "../state/keptScroll";
import { categorySections, movingCategory, renamingCategory, refileTiles, sameCategory, cleanName, useFoldedCategories, type CategorySection } from "../state/botCategories";
import { ask, askText } from "../state/dialogs";

const BOT_DRAG = "application/x-conduit-bot";
/** A portrait carried to another place: its tile key (the bot's name, or the mixed grid's key). */
const BOT_MOVE = "application/x-conduit-bot-move";
/** A group chat's tile carried to another place: its room id. */
const ROOM_MOVE = "application/x-conduit-room-move";

/** What a bot's right-click menu can do, besides Edit Bot. */
export type BotAction = "pin" | "unpin" | "duplicate" | "hide" | "show" | "delete";

/**
 * The face a reply's header draws for `bot`, moving on the newest reply. It
 * keeps one identity while the bot looks the same, so the transcript's
 * memoized replies aren't redrawn each time the roster is read again.
 */
export function useReplyFace(bot: Bot | undefined): ((moving: boolean) => ReactNode) | undefined {
  // Only what the face draws, so a new last line doesn't redraw every reply.
  const look = bot ? [bot.name, bot.title, bot.hasAvatar, bot.face, bot.color ?? ""].join("\t") : "";
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => (bot ? (moving: boolean) => <BotAvatar bot={bot} size={22} moving={moving} /> : undefined), [look]);
}

/** A bot's picture, else its starter face (on the color Hermes keeps for it, when it has one). */
/**
 * A bot's face. A moving picture plays only where the face is what you're
 * looking at (`moving`: the bots sidebar, the newest reply's face, the editor),
 * and never with Reduce Motion; everywhere else it keeps its first frame.
 */
export function BotAvatar({ bot, size, moving = false, host }: { bot: Bot; size: number; moving?: boolean; host?: string }) {
  const url = useFace(useAvatar(bot.name, bot.hasAvatar, host), moving);
  // Its ring is its chat's glow color, as on the phone.
  const color = useContext(GlowContext)(bot.name);
  return (
    <span
      className="bot-avatar"
      style={{
        width: size,
        height: size,
        boxShadow: `0 0 0 2px color-mix(in srgb, ${color} 25%, transparent)`,
      }}
      aria-hidden="true"
    >
      {url ? (
        <img src={url} alt="" draggable={false} />
      ) : (
        <StarterFaceArt
          face={starterFace(bot.face)}
          background={keptColor(bot.color)}
        />
      )}
    </span>
  );
}

/** Another person, or another person's agent, as their own Conduit draws them (a room look), else their initial. */
export function LookFace({ look, name, size }: { look?: RoomLook; name: string; size: number }) {
  const url = lookPictureUrl(look);
  return (
    <span
      className="bot-avatar look-face"
      style={{
        width: size,
        height: size,
        background: url ? undefined : look?.color,
        color: url || !look?.color ? undefined : "#fff",
        boxShadow: look?.color ? `0 0 0 2px color-mix(in srgb, ${look.color} 25%, transparent)` : undefined,
      }}
      aria-hidden="true"
    >
      {url ? (
        <img src={url} alt="" draggable={false} />
      ) : (
        <span className="look-initial" style={{ fontSize: Math.max(8, size * 0.45) }}>
          {name.trim().charAt(0).toUpperCase()}
        </span>
      )}
    </span>
  );
}

/** A room's icon: its bots' faces overlapping, with other people's agents that have a look. */
export function RoomFaces({
  room,
  bots,
  size,
  looks,
  host,
}: {
  room: Pick<Room, "members">;
  bots: Bot[];
  size: number;
  looks?: RoomLooks;
  /** Another combined host the bots are on, whose pictures they show. */
  host?: string;
}) {
  const shown = room.members
    .flatMap((m): ({ key: string; bot: Bot } | { key: string; look: RoomLook; name: string })[] => {
      if (m.peer) {
        const look = memberLook(looks, m);
        return look ? [{ key: `peer:${m.memberId}`, look, name: m.displayName ?? m.memberId }] : [];
      }
      const bot = bots.find((b) => b.name === (m.profile ?? m.memberId));
      return bot ? [{ key: bot.name, bot }] : [];
    })
    .slice(0, 4);
  return (
    <span className="room-faces" style={{ height: size }} aria-hidden="true">
      {shown.map((face, i) => (
        <span
          key={face.key}
          style={{ marginLeft: i ? -size * 0.38 : 0, zIndex: shown.length - i }}
        >
          {"bot" in face ? <BotAvatar bot={face.bot} size={size} host={host} /> : <LookFace look={face.look} name={face.name} size={size} />}
        </span>
      ))}
    </span>
  );
}

interface Props {
  bots: Bot[] | null;
  error: string | null;
  runningProfiles: ReadonlySet<string>;
  /** What the open chat's reply is doing now ("Running a command"), and its bot, while it answers. */
  liveDoing?: { bot: string; text: string } | null;
  /** What each bot answering in any chat is doing there, as the plugin notes it (null when it doesn't). */
  otherChatsDoing?: ReadonlyMap<string, string | null>;
  rooms: Room[] | null;
  canStartRooms: boolean;
  onOpen: (bot: Bot) => void;
  onOpenRoom: (room: Room) => void;
  onCreateRoom: (roomId: string, name: string, bots: Bot[]) => Promise<Room>;
  /** Edit Bot, from a bot's right-click menu. */
  onEdit?: (bot: Bot) => void;
  /** Each bot's workstreams: what needs you and what's working. */
  work?: ReadonlyMap<string, BotWork>;
  /** Bots hidden from the list, shown under Hidden with Show. */
  hidden?: Bot[];
  onNewBot?: () => void;
  /** Pin, Duplicate, Hide, Show or Delete; answers what went wrong, if anything. */
  onAction?: (kind: BotAction, bot: Bot) => Promise<string | null>;
  notice?: string | null;
  onDismissNotice?: () => void;
  /** Invites to rooms people you've linked host, as Group chats lists them. */
  invites?: RoomInvite[];
  onOpenInvite?: (invite: RoomInvite) => void;
  /** Rooms people you've linked host that your agents are in, from this Hermes' copies: each in its invite's place. */
  copies?: RoomCopy[];
  onOpenCopy?: (copy: RoomCopy) => void;
  /** The copies an agent of yours waits in for your approval. */
  copiesWaiting?: ReadonlySet<string>;
  /** Rooms with people you've linked that haven't started: who they wait for, or why they ended. */
  drafts?: RoomDraft[];
  onOpenDraft?: (draft: RoomDraft) => void;
  /** New Group Chat: your bots, and people you've linked. */
  onNewGroup?: () => void;
  /** How the rooms over Links look, by room id: other people's agents' faces. */
  roomLooks?: Record<string, RoomLooks>;
  /** Combined dashboards: the other hosts' bots mixed in with this host's, badged, each opening through a switch. */
  otherBots?: OtherBot[];
  /** Saved Dashboards' order, by address: the mixed grid's until it's arranged. */
  savedHosts?: string[];
  /** The combined dashboards kept live beside this one: a category rename or delete re-files their hidden bots too. */
  keptHostUrls?: string[];
  /** The mixed grid's order (botOrder.ts mixedBotKey), kept on this computer. */
  mixedOrder?: string[];
  /** A mixed grid's portrait dropped on another's place (null: at the end), by their keys. */
  onMoveMixed?: (dragged: string, target: string | null, shown: string[]) => void;
  /** This host's portrait dropped on another's place (null: at the end), by bot name, among `shown`. */
  onMoveBot?: (moved: string, target: string | null, shown: string[]) => void;
  /** Another dashboard's bot as your own other Hermes brings it into a room here, or null when none does. */
  farFor?: (host: string, name: string) => OwnHermesBot | null;
  /** Starts a room with this host's bots and your other Hermes' (a draft they join by themselves). */
  onCreateFarDraft?: (name: string, bots: Bot[], far: OwnHermesBot[]) => Promise<"made" | "sending">;
  /** A group chat's tile dropped on another's place (null: at the end), by room id, among `shown`. */
  onMoveRoom?: (moved: string, target: string | null, shown: string[]) => void;
  badgeFor?: (url: string) => HostBadge | null;
  onOpenOther?: (other: OtherBot) => void;
  /**
   * Combined dashboards: the other hosts' group chats, badged, each room once under the host you talk in it from,
   * opening through a switch; the ones Saved Dashboards puts before this host and after it, as each host shows
   * them, so a tap on one, which switches there, moves nothing.
   */
  otherRoomsBefore?: OtherRoom[];
  otherRoomsAfter?: OtherRoom[];
  /** The other hosts' bots' work, by keptWorkKey, for their pills. */
  otherWork?: ReadonlyMap<string, BotWork>;
  onOpenOtherRoom?: (other: OtherRoom) => void;
  /** The host on screen: in a combined group its bots carry its badge too, so the group reads as one set. */
  hostUrl?: string;
  /**
   * Drawn as the sidebar beside the open chat or group chat instead of a
   * page (Eric, 2026-11-20): the bots as rows, Group chats under them, and
   * New Bot and New Group Chat on their headings. Names what's open.
   */
  /** `openHost`: the open Bot Chat is another combined dashboard's, docked in place, so its bot is the one marked open. */
  side: { openProfile?: string; openRoomId?: string; openHost?: string };
  /** Hides the list beside the chat: the « at its top. */
  onHide?: () => void;
  /**
   * The group chat being started, kept by the window so it outlives this list (leaving Bots for
   * Chats and coming back keeps its picked bots and name, desktop#336). Without it, the list keeps its own.
   */
  draft?: BotsDraft | null;
  onDraft?: Dispatch<SetStateAction<BotsDraft | null>>;
  /**
   * Bot categories (state/botCategories.ts): the headings' order (synced as `bots.categories`), and a write
   * that files bots, this host's or another dashboard's on its own Hermes, under a name (null: none). Without
   * it, no headings and no Category in a bot's menu.
   */
  categories?: BotCategories;
}

export interface BotCategories {
  order: string[];
  setOrder: (next: string[]) => void;
  /** Files each tile's bot under `name` (null: out of its category); what to tell the person, or null. */
  file: (tiles: MixedTile[], name: string | null) => Promise<string | null>;
  /** This host's group chats filed under a category, room id to name (synced as `groups.categories`). */
  rooms?: Record<string, string>;
  /** Files a group chat under `name` (null: back to Group chats). */
  fileRoom?: (roomId: string, name: string | null) => void;
  /** Every group chat in `old` re-filed under `to` (null: back to Group chats). */
  refileRooms?: (old: string, to: string | null) => void;
}

/** A bot's pill: what needs you first, then what's working, else nothing. */
export function workPill(work: BotWork | undefined): { text: string; needs: boolean } | null {
  if (!work) return null;
  if (work.needsYou > 0) return { text: t("{count} needs you", { count: work.needsYou }), needs: true };
  if (work.working > 0) return { text: t("{count} working", { count: work.working }), needs: false };
  return null;
}

/** Another combined dashboard's bot in a room being started, brought by your own other Hermes. */
interface FarMember {
  key: string;
  host: string;
  bot: Bot;
  far: OwnHermesBot;
}

/** A group chat being started from the bots: who's picked, its name, and whether it's being made. */
export interface BotsDraft {
  roomId: string;
  members: string[];
  /** Another dashboard's bots, brought over your own Link to it (a room's draft, not a room). */
  far?: FarMember[];
  name: string;
  busy: boolean;
  error?: string;
}

/**
 * The bots sidebar beside a Bot Chat or a group chat, Bots home's place on
 * the phone: the bots as rows with their work pill, Group chats under them,
 * Hidden at the end. A bot opens its Bot Chat. A bot dropped on another
 * starts a group chat: a bar lists the bots, more join by a drop or a click,
 * and Create makes the room.
 */
export function BotsHome({
  bots,
  error,
  runningProfiles,
  liveDoing,
  otherChatsDoing,
  rooms,
  canStartRooms,
  onOpen,
  onOpenRoom,
  onCreateRoom,
  onEdit,
  work,
  hidden,
  onNewBot,
  onAction,
  notice,
  onDismissNotice,
  invites,
  onOpenInvite,
  copies,
  onOpenCopy,
  copiesWaiting,
  drafts,
  onOpenDraft,
  onNewGroup,
  roomLooks,
  otherBots = [],
  otherRoomsBefore = [],
  otherRoomsAfter = [],
  otherWork,
  onOpenOtherRoom,
  badgeFor,
  onOpenOther,
  hostUrl,
  savedHosts = [],
  keptHostUrls = [],
  mixedOrder = [],
  onMoveMixed,
  onMoveBot,
  onMoveRoom,
  farFor,
  onCreateFarDraft,
  side,
  onHide,
  draft: keptDraft,
  onDraft,
  categories,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const act = (kind: BotAction, bot: Bot) => {
    if (!onAction) return;
    setMenu(null);
    setBusy(true);
    setActionError(null);
    void onAction(kind, bot)
      .then(setActionError)
      .finally(() => setBusy(false));
  };
  const [menu, setMenu] = useState<{ bot: Bot; tile?: MixedTile; x: number; y: number } | null>(
    null,
  );
  /** A heading's menu: Rename…, Move Earlier and Later, Delete Category. */
  const [headingMenu, setHeadingMenu] = useState<{ name: string; x: number; y: number } | null>(null);
  /** A group chat's menu: its Category. */
  const [roomMenu, setRoomMenu] = useState<{ roomId: string; x: number; y: number } | null>(null);
  useEffect(() => {
    if (!menu && !headingMenu && !roomMenu) return;
    const close = () => {
      setMenu(null);
      setHeadingMenu(null);
      setRoomMenu(null);
    };
    window.addEventListener("click", close);
    window.addEventListener("blur", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("blur", close);
    };
  }, [menu, headingMenu, roomMenu]);
  const openMenu = onEdit
    ? (bot: Bot, tile?: MixedTile) => (e: MouseEvent) => {
        e.preventDefault();
        setHeadingMenu(null);
        setMenu({ bot, tile, x: e.clientX, y: e.clientY });
      }
    : undefined;
  // One grid: this host's bots in their order, or in a combined group every
  // dashboard's mixed in the group's order.
  const mixed = otherBots.length > 0 && !!hostUrl;
  const tiles: MixedTile[] = mixed
    ? mixedTiles(hostUrl!, bots ?? [], otherBots, savedHosts, mixedOrder)
    : (bots ?? []).map((bot) => ({ key: bot.name, host: hostUrl ?? "", bot, own: true }));
  const [botQuery, setBotQuery] = useState("");
  const foundTiles = tiles.filter((tile) => matchesBot(tile.bot.name, tile.bot.title, botQuery));
  const foundHidden = (hidden ?? []).filter((bot) => matchesBot(bot.name, bot.title, botQuery));
  // Dragging a filtered subset would rewrite the whole order with only its rows, so keep it still while searching.
  const shownKeys = (botQuery ? foundTiles : tiles).map((tile) => tile.key);
  const canMove = !botQuery && tiles.length > 1 && !!(mixed ? onMoveMixed : onMoveBot);
  const move = (dragged: string, target: string | null) => {
    if (mixed) onMoveMixed?.(dragged, target, shownKeys);
    else onMoveBot?.(dragged, target, shownKeys);
  };
  /** Move Earlier or Move Later from a bot's menu, or null at that end. */
  const step = (bot: Bot, by: -1 | 1): (() => void) | null => {
    if (!canMove) return null;
    const key = mixed ? mixedBotKey(hostUrl!, bot.name) : bot.name;
    const next = neighbour(shownKeys, key, by);
    return next ? () => move(key, next) : null;
  };
  const [dragging, setDragging] = useState<string | null>(null);
  const [moveTarget, setMoveTarget] = useState<string | null>(null);
  const ownBadge = hostUrl && badgeFor ? badgeFor(hostUrl) : null;
  const [ownDraft, setOwnDraft] = useState<BotsDraft | null>(null);
  const draft = onDraft ? (keptDraft ?? null) : ownDraft;
  const setDraft = onDraft ?? setOwnDraft;
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const canDrag = canStartRooms && (bots?.length ?? 0) >= ROOM_MIN_MEMBERS;

  const join = (...names: string[]) => {
    setDraft((current) => {
      if (current?.busy) return current;
      const base = current ?? {
        roomId: crypto.randomUUID(),
        members: [],
        name: "",
        busy: false,
      };
      return {
        ...base,
        members: addToDraft(base.members, ...names),
        error: undefined,
      };
    });
  };
  const leave = (name: string) =>
    setDraft((current) =>
      current && !current.busy
        ? { ...current, members: current.members.filter((m) => m !== name) }
        : current,
    );
  // Another dashboard's bot joins as your own other Hermes brings it.
  const farOf = (tile: MixedTile): FarMember | null => {
    if (tile.own || !onCreateFarDraft || !canStartRooms) return null;
    const far = farFor?.(tile.host, tile.bot.name);
    return far ? { key: tile.key, host: tile.host, bot: tile.bot, far } : null;
  };
  const farFits = (own: number, current: FarMember[], adding: FarMember[]) =>
    canAddFar(own, current.map((m) => m.far), adding.filter((m) => !current.some((c) => c.key === m.key)).map((m) => m.far), ROOM_MAX_MEMBERS);
  const joinMixed = (names: string[], far: FarMember[]) =>
    setDraft((current) => {
      if (current?.busy) return current;
      const base = current ?? { roomId: crypto.randomUUID(), members: [], name: "", busy: false };
      const members = addToDraft(base.members, ...names);
      const kept = base.far ?? [];
      if (!farFits(members.length, kept, far)) return current;
      return { ...base, members, far: [...kept, ...far.filter((m) => !kept.some((k) => k.key === m.key))], error: undefined };
    });
  const leaveFar = (key: string) =>
    setDraft((current) =>
      current && !current.busy ? { ...current, far: (current.far ?? []).filter((m) => m.key !== key) } : current,
    );

  const draftBots = draft
    ? draft.members
        .map((name) => bots?.find((b) => b.name === name))
        .filter((b): b is Bot => !!b)
    : [];
  const draftFar = draft?.far ?? [];
  const draftCount = draftBots.length + draftFar.length;
  const draftTitles = [...draftBots.map((b) => b.title), ...draftFar.map((m) => m.bot.title)];
  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft || draftCount < ROOM_MIN_MEMBERS || draft.busy) return;
    const name = draft.name.trim() || defaultRoomName(draftTitles);
    setDraft({ ...draft, busy: true, error: undefined });
    if (draftFar.length && onCreateFarDraft) {
      // A room with your other Hermes' bots starts as a draft they join by themselves.
      try {
        const outcome = await onCreateFarDraft(name, draftBots, draftFar.map((m) => m.far));
        setDraft(null);
        if (outcome === "sending") setActionError(t("Your Hermes is still sending the invites. The room shows under Group Chats once it has."));
      } catch (e) {
        setDraft((current) => (current ? { ...current, busy: false, error: e instanceof Error ? e.message : String(e) } : current));
      }
      return;
    }
    try {
      const room = await onCreateRoom(draft.roomId, name, draftBots);
      setDraft(null);
      onOpenRoom(room);
    } catch (e) {
      // Kept with the same room id, so a retry never makes a twin.
      setDraft((current) =>
        current
          ? {
              ...current,
              busy: false,
              error: e instanceof Error ? e.message : String(e),
            }
          : current,
      );
    }
  };

  // A portrait dropped on another's face starts a room (this host's bots,
  // when it can make one); dropped anywhere else on its cell, it takes that
  // place, as an app does on the Home Screen.
  const overFace = (e: DragEvent) => !!(e.target as Element | null)?.closest?.(".bot-tile-face");
  const endDrag = () => {
    setDropTarget(null);
    setMoveTarget(null);
    setDragging(null);
  };
  /**
   * Whether `source` held over `target`'s face starts (or grows) a room:
   * two of this host's bots as before; one of this host's and another
   * dashboard's that your own other Hermes brings; or two of that one's
   * once a bot here is in the room being started.
   */
  const merging = (source: MixedTile, target: MixedTile): { names: string[]; far: FarMember[] } | null => {
    if (source.key === target.key || !canStartRooms) return null;
    if (source.own && target.own) return canDrag ? { names: [target.bot.name, source.bot.name], far: [] } : null;
    const names = [source, target].filter((tile) => tile.own).map((tile) => tile.bot.name);
    const far = [source, target].filter((tile) => !tile.own).map(farOf);
    if (far.some((m) => !m)) return null;
    const members = addToDraft(draft?.members ?? [], ...names);
    return farFits(members.length, draft?.far ?? [], far as FarMember[]) ? { names, far: far as FarMember[] } : null;
  };
  const tileOf = (key: string | null) => (key ? tiles.find((tile) => tile.key === key) ?? null : null);
  const tileDrag = (tile: MixedTile) => {
    const { bot, key } = tile;
    const roomsHere = canStartRooms && (tile.own ? canDrag || !!onCreateFarDraft : !!farOf(tile));
    if (!roomsHere && !canMove) return {};
    return {
      draggable: true,
      onDragStart: (e: DragEvent) => {
        if (tile.own && canDrag) e.dataTransfer.setData(BOT_DRAG, bot.name);
        e.dataTransfer.setData(BOT_MOVE, key);
        e.dataTransfer.effectAllowed = "copyMove";
        setDragging(key);
      },
      onDragOver: (e: DragEvent) => {
        const types = e.dataTransfer.types;
        const source = tileOf(dragging);
        const room = !!source && overFace(e) && !!merging(source, tile);
        const moves = canMove && types.includes(BOT_MOVE) && !room && dragging !== key;
        if (!room && !moves && !(source && overFace(e))) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = room ? "copy" : "move";
        setDropTarget(room ? key : null);
        setMoveTarget(moves ? key : null);
      },
      onDragLeave: () => {
        setDropTarget((t) => (t === key ? null : t));
        setMoveTarget((t) => (t === key ? null : t));
      },
      onDrop: (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const moved = e.dataTransfer.getData(BOT_MOVE) || dragging;
        const source = tileOf(moved);
        endDrag();
        const merge = source && overFace(e) ? merging(source, tile) : null;
        if (merge) {
          if (!merge.far.length && source!.own && tile.own) join(...merge.names);
          else joinMixed(merge.names, merge.far);
          return;
        }
        if (source?.key === key && draft && tile.own && overFace(e)) return join(bot.name);
        if (moved && moved !== key && canMove) move(moved, key);
      },
      onDragEnd: endDrag,
    };
  };
  /** A drop past the last portrait, in the grid's empty space, goes to the end. */
  const gridDrop = canMove
    ? {
        onDragOver: (e: DragEvent) => {
          if (e.target !== e.currentTarget || !e.dataTransfer.types.includes(BOT_MOVE)) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
        },
        onDrop: (e: DragEvent) => {
          if (e.target !== e.currentTarget) return;
          const moved = e.dataTransfer.getData(BOT_MOVE);
          endDrag();
          if (moved) {
            e.preventDefault();
            move(moved, null);
          }
        },
      }
    : {};

  // A group chat's tile dropped on another's takes its place, as a bot does.
  const [roomTarget, setRoomTarget] = useState<string | null>(null);
  const roomIds = (rooms ?? []).map((room) => room.roomId);
  const canMoveRooms = !!onMoveRoom && roomIds.length > 1;
  const roomDrag = (roomId: string) =>
    canMoveRooms
      ? {
          draggable: true,
          onDragStart: (e: DragEvent) => {
            e.dataTransfer.setData(ROOM_MOVE, roomId);
            e.dataTransfer.effectAllowed = "move";
          },
          onDragOver: (e: DragEvent) => {
            if (!e.dataTransfer.types.includes(ROOM_MOVE)) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            if (roomTarget !== roomId) setRoomTarget(roomId);
          },
          onDragLeave: () => setRoomTarget((t) => (t === roomId ? null : t)),
          onDrop: (e: DragEvent) => {
            const moved = e.dataTransfer.getData(ROOM_MOVE);
            setRoomTarget(null);
            if (!moved) return;
            e.preventDefault();
            e.stopPropagation();
            if (moved !== roomId) onMoveRoom?.(moved, roomId, roomIds);
          },
          onDragEnd: () => setRoomTarget(null),
        }
      : {};
  /** A tile dropped in the rooms' empty space goes to the end. */
  const roomsGridDrop = canMoveRooms
    ? {
        onDragOver: (e: DragEvent) => {
          if (e.target !== e.currentTarget || !e.dataTransfer.types.includes(ROOM_MOVE)) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
        },
        onDrop: (e: DragEvent) => {
          const moved = e.dataTransfer.getData(ROOM_MOVE);
          setRoomTarget(null);
          if (e.target !== e.currentTarget || !moved) return;
          e.preventDefault();
          onMoveRoom?.(moved, null, roomIds);
        },
      }
    : {};

  const openOrPick = (bot: Bot) => {
    if (!draft) return onOpen(bot);
    if (draft.members.includes(bot.name)) leave(bot.name);
    else join(bot.name);
  };

  // Categories: a heading over each one's bots, Other last (the phone's Bots Home, option A).
  const { folded, toggle: toggleFold } = useFoldedCategories();
  const filedRooms = categories?.rooms ?? {};
  const roomCategory = (roomId: string): string | null => filedRooms[roomId] ?? null;
  const roomsIn = (name: string | null) => (name && categories?.rooms ? (rooms ?? []).filter((room) => sameCategory(roomCategory(room.roomId), name)) : []);
  const sections = categories
    ? categorySections(tiles, categories.order, (tile) => tile.bot.category?.name, categories.rooms ? (rooms ?? []).flatMap((room) => (roomCategory(room.roomId) ? [roomCategory(room.roomId)!] : [])) : [])
    : null;
  const categoryNames = (sections ?? []).flatMap((section) => (section.name ? [section.name] : []));
  const [headingTarget, setHeadingTarget] = useState<string | null>(null);
  const fileTiles = (chosen: MixedTile[], name: string | null) => {
    if (!categories || !chosen.length) return;
    setMenu(null);
    setHeadingMenu(null);
    setBusy(true);
    setActionError(null);
    void categories
      .file(chosen, name)
      .then(setActionError)
      .finally(() => setBusy(false));
  };
  /** Every bot a rename or delete re-files, shown or hidden, on this host and each live combined one (refileTiles). */
  const fileable = refileTiles(
    tiles,
    (hidden ?? []).map((bot) => ({ key: mixed ? mixedBotKey(hostUrl!, bot.name) : bot.name, host: hostUrl ?? "", bot, own: true })),
    keptHostUrls,
    (url) => keptHiddenBots(url).map((o) => ({ key: mixedBotKey(o.host, o.bot.name), host: o.host, bot: o.bot, own: false })),
    hostUrl,
  );
  const newCategory = async (tile: MixedTile) => {
    setMenu(null);
    const name = cleanName(await askText(t("New Category"), "", { confirm: t("Create"), maxLength: 40 }));
    if (name) fileTiles([tile], name);
  };
  const renameCategory = async (old: string) => {
    setHeadingMenu(null);
    const name = cleanName(await askText(t("Rename Category"), old, { confirm: t("Save"), maxLength: 40 }));
    if (!name || name === old || !categories) return;
    categories.setOrder(renamingCategory(categories.order, old, name));
    categories.refileRooms?.(old, name);
    fileTiles(fileable.filter((tile) => sameCategory(tile.bot.category?.name, old)), name);
  };
  const deleteCategory = async (name: string) => {
    setHeadingMenu(null);
    if (!(await ask(`${t("Delete {name}?", { name })}\n\n${t("Its bots move to Other, and its group chats back to Group chats.")}`, { confirm: t("Delete Category"), destructive: true }))) return;
    categories?.refileRooms?.(name, null);
    fileTiles(fileable.filter((tile) => sameCategory(tile.bot.category?.name, name)), null);
  };
  const moveCategory = (name: string, by: -1 | 1) => {
    setHeadingMenu(null);
    categories?.setOrder(movingCategory(categories.order, name, by, categoryNames));
  };
  const categoryItems = (tile: MixedTile) => (
    <>
      <div className="menu-note bot-category-label" role="presentation">{t("Category")}</div>
      {categoryNames.map((name) => (
        <button key={name} role="menuitemradio" aria-checked={sameCategory(tile.bot.category?.name, name)} disabled={busy} onClick={() => fileTiles([tile], name)}>
          {sameCategory(tile.bot.category?.name, name) ? "✓ " : ""}{name}
        </button>
      ))}
      <button role="menuitem" disabled={busy} onClick={() => void newCategory(tile)}>
        {t("New Category…")}
      </button>
      {tile.bot.category ? (
        <button role="menuitem" disabled={busy} onClick={() => fileTiles([tile], null)}>
          {t("Remove from Category")}
        </button>
      ) : null}
    </>
  );
  const fileRoom = async (roomId: string, name: string | null | "new") => {
    setRoomMenu(null);
    const chosen = name === "new" ? cleanName(await askText(t("New Category"), "", { confirm: t("Create"), maxLength: 40 })) : name;
    if (name === "new" && !chosen) return;
    categories?.fileRoom?.(roomId, chosen);
  };
  const roomMenuEl = roomMenu ? (
    <div className="host-menu row-menu" role="menu" style={{ left: Math.min(roomMenu.x, window.innerWidth - 200), top: Math.max(8, Math.min(roomMenu.y, window.innerHeight - 36 * (categoryNames.length + 3))) }}>
      <div className="menu-note bot-category-label" role="presentation">{t("Category")}</div>
      {categoryNames.map((name) => (
        <button key={name} role="menuitemradio" aria-checked={sameCategory(roomCategory(roomMenu.roomId), name)} onClick={() => void fileRoom(roomMenu.roomId, name)}>
          {sameCategory(roomCategory(roomMenu.roomId), name) ? "✓ " : ""}{name}
        </button>
      ))}
      <button role="menuitem" onClick={() => void fileRoom(roomMenu.roomId, "new")}>
        {t("New Category…")}
      </button>
      {roomCategory(roomMenu.roomId) ? (
        <button role="menuitem" onClick={() => void fileRoom(roomMenu.roomId, null)}>
          {t("Remove from Category")}
        </button>
      ) : null}
    </div>
  ) : null;
  const headingMenuEl = headingMenu ? (() => {
    const at = categoryNames.findIndex((name) => sameCategory(name, headingMenu.name));
    return (
      <div className="host-menu row-menu" role="menu" style={{ left: Math.min(headingMenu.x, window.innerWidth - 200), top: Math.min(headingMenu.y, window.innerHeight - 160) }}>
        <button role="menuitem" disabled={busy} onClick={() => void renameCategory(headingMenu.name)}>
          {t("Rename…")}
        </button>
        <button role="menuitem" disabled={at <= 0} onClick={() => moveCategory(headingMenu.name, -1)}>
          {t("Move Earlier")}
        </button>
        <button role="menuitem" disabled={at < 0 || at >= categoryNames.length - 1} onClick={() => moveCategory(headingMenu.name, 1)}>
          {t("Move Later")}
        </button>
        <button role="menuitem" className="danger" disabled={busy} onClick={() => void deleteCategory(headingMenu.name)}>
          {t("Delete Category")}
        </button>
      </div>
    );
  })() : null;
  /** A category's heading: a click folds it; folded, its faces small and what its bots wait on you for. A bot dropped on it files there. */
  const heading = (section: CategorySection<MixedTile>) => {
    const isFolded = folded.includes(section.key);
    const waiting = isFolded
      ? section.items.reduce((sum, tile) => sum + ((tile.own ? work?.get(tile.bot.name) : otherWork?.get(keptWorkKey(tile.host, tile.bot.name)))?.needsYou ?? 0), 0)
      : 0;
    const title = section.name ?? t("Other");
    return (
      <div
        className={`bot-side-section-head bot-category-head${headingTarget === section.key ? " drop-target" : ""}`}
        onDragOver={(e) => {
          const room = !!categories?.fileRoom && e.dataTransfer.types.includes(ROOM_MOVE);
          if (!room && (!onEdit || !categories || !e.dataTransfer.types.includes(BOT_MOVE))) return;
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = "move";
          if (headingTarget !== section.key) setHeadingTarget(section.key);
        }}
        onDragLeave={() => setHeadingTarget((key) => (key === section.key ? null : key))}
        onDrop={(e) => {
          setHeadingTarget(null);
          // A group chat's row files that room; on Other it goes back to Group chats.
          const roomId = categories?.fileRoom ? e.dataTransfer.getData(ROOM_MOVE) : "";
          if (roomId && (rooms ?? []).some((room) => room.roomId === roomId)) {
            e.preventDefault();
            e.stopPropagation();
            categories!.fileRoom!(roomId, section.name);
            return;
          }
          const moved = e.dataTransfer.getData(BOT_MOVE) || dragging;
          const tile = tileOf(moved);
          if (!tile) return;
          e.preventDefault();
          e.stopPropagation();
          endDrag();
          if (!sameCategory(tile.bot.category?.name, section.name)) fileTiles([tile], section.name);
        }}
      >
        <button
          className="bot-category-toggle"
          aria-expanded={!isFolded}
          onClick={() => toggleFold(section.key)}
          onContextMenu={
            section.name && onEdit && categories
              ? (e) => {
                  e.preventDefault();
                  setMenu(null);
                  setHeadingMenu({ name: section.name!, x: e.clientX, y: e.clientY });
                }
              : undefined
          }
        >
          <Icon name={isFolded ? "chevron" : "chevronDown"} />
          <h2>{title}</h2>
          <span className="bot-category-count">{section.items.length + roomsIn(section.name).length}</span>
        </button>
        {isFolded ? (
          <span className="bot-category-faces" aria-hidden="true">
            {section.items.slice(0, 4).map((tile) => (
              <BotAvatar key={tile.key} bot={tile.bot} size={16} host={tile.own ? undefined : tile.host} />
            ))}
          </span>
        ) : null}
        {waiting ? <span className="bot-category-waiting" title={t("Needs you")}>{waiting}</span> : null}
      </div>
    );
  };

  const draftForm = draft ? (
        <form
          className="room-draft"
          onSubmit={create}
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes(BOT_DRAG)) e.preventDefault();
          }}
          onDrop={(e) => {
            e.preventDefault();
            const dragged = e.dataTransfer.getData(BOT_DRAG);
            if (dragged) join(dragged);
          }}
        >
          <div className="room-draft-faces">
            {draftBots.map((bot) => (
              <button
                key={bot.name}
                type="button"
                className="draft-face"
                title={t('Take {name} out', { name: bot.title })}
                onClick={() => leave(bot.name)}
                disabled={draft.busy}
              >
                <BotAvatar bot={bot} size={36} />
                <span className="draft-x" aria-hidden="true">
                  <Icon name="close" />
                </span>
              </button>
            ))}
            {draftFar.map((member) => {
              const badge = badgeFor?.(member.host) ?? null;
              return (
                <button
                  key={member.key}
                  type="button"
                  className="draft-face"
                  title={t('Take {name} out', { name: member.bot.title })}
                  onClick={() => leaveFar(member.key)}
                  disabled={draft.busy}
                >
                  <BotAvatar bot={member.bot} size={36} host={member.host} />
                  {badge ? <span className="draft-badge"><HostBadgeMark badge={badge} /></span> : null}
                  <span className="draft-x" aria-hidden="true">
                    <Icon name="close" />
                  </span>
                </button>
              );
            })}
            <span className="meta">
              {draftCount < ROOM_MIN_MEMBERS
                ? t('Drop or click one more bot.')
                : draftCount >= ROOM_MAX_MEMBERS
                  ? t('Six is the most a room holds.')
                  : t('Click or drop more bots to add them.')}
            </span>
          </div>
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder={
              draftCount
                ? defaultRoomName(draftTitles)
                : t('Room name')
            }
            aria-label={t('Group chat name')}
            disabled={draft.busy}
            autoFocus
          />
          <div className="room-draft-actions">
            {draft.error ? (
              <span className="draft-error">{draft.error}</span>
            ) : null}
            <button
              type="button"
              className="secondary"
              onClick={() => setDraft(null)}
              disabled={draft.busy}
            >
              {t('Cancel')}
            </button>
            <button
              type="submit"
              className="primary"
              disabled={draftCount < ROOM_MIN_MEMBERS || draft.busy}
            >
              {draft.busy ? t('Creating…') : t('Create')}
            </button>
          </div>
        </form>
      ) : null;
  const menuOwn = !menu?.tile || menu.tile.own;
  const menuEl = menu && onEdit ? (
        <div
          className="host-menu row-menu"
          role="menu"
          style={{
            left: Math.min(menu.x, window.innerWidth - 200),
            top: Math.max(8, Math.min(menu.y, window.innerHeight - (menuOwn ? (onAction ? 220 : 80) + (canMove ? 72 : 0) : 0) - (categories ? 36 * (categoryNames.length + 3) : 0))),
          }}
        >
          {menuOwn ? (
          <>
          <button role="menuitem" onClick={() => onEdit(menu.bot)}>
            {t("Edit Bot")}
          </button>
          {canMove ? (
            <>
              <button role="menuitem" disabled={!step(menu.bot, -1)} onClick={() => step(menu.bot, -1)?.()}>
                {t("Move Earlier")}
              </button>
              <button role="menuitem" disabled={!step(menu.bot, 1)} onClick={() => step(menu.bot, 1)?.()}>
                {t("Move Later")}
              </button>
            </>
          ) : null}
          {onAction ? (
            <>
              <button role="menuitem" disabled={busy} onClick={() => act(menu.bot.pinned ? "unpin" : "pin", menu.bot)}>
                {menu.bot.pinned ? t("Unpin") : t("Pin")}
              </button>
              <button role="menuitem" disabled={busy} onClick={() => act("duplicate", menu.bot)}>
                {t("Duplicate")}
              </button>
              <button role="menuitem" disabled={busy} onClick={() => act("hide", menu.bot)}>
                {t("Hide")}
              </button>
              {canDelete(menu.bot) ? (
                <button role="menuitem" className="danger" disabled={busy} onClick={() => act("delete", menu.bot)}>
                  {t("Delete Bot")}
                </button>
              ) : null}
            </>
          ) : null}
          </>
          ) : null}
          {categories && menu.tile ? categoryItems(menu.tile) : null}
        </div>
      ) : headingMenuEl ?? roomMenuEl;

  const roomRow = (key: string, faces: ReactNode, name: string, line: string | null, onClick: () => void, extra?: { className?: string; current?: boolean; waiting?: boolean; drag?: object; onContextMenu?: (e: MouseEvent) => void }) => (
    <button
      key={key}
      className={`row bot-side-bot bot-side-room${extra?.className ? ` ${extra.className}` : ""}`}
      aria-current={extra?.current ? "true" : undefined}
      onClick={onClick}
      onContextMenu={extra?.onContextMenu}
      {...extra?.drag}
    >
      <span className="bot-side-face">{faces}</span>
      <span className="bot-side-text">
        <span className="row-title">{name}</span>
        {line ? <span className={`meta${extra?.waiting ? " bot-side-pill needs" : ""}`}>{line}</span> : null}
      </span>
    </button>
  );
  /** One of this host's group chats; its right-click menu files it under a category. */
  const ownRoomRow = (room: Room) =>
    roomRow(
      room.roomId,
      <RoomFaces room={room} bots={bots ?? []} size={22} looks={room.linked ? roomLooks?.[room.roomId] : undefined} />,
      room.name,
      room.updatedAt ? timeLabel(room.updatedAt) : null,
      () => onOpenRoom(room),
      {
        className: roomTarget === room.roomId ? "move-target" : undefined,
        current: !side.openHost && side.openRoomId === room.roomId,
        drag: roomDrag(room.roomId),
        onContextMenu: categories?.fileRoom
          ? (e) => {
              e.preventDefault();
              e.stopPropagation();
              setMenu(null);
              setHeadingMenu(null);
              setRoomMenu({ roomId: room.roomId, x: e.clientX, y: e.clientY });
            }
          : undefined,
      },
    );
  const glyph = (name: Parameters<typeof Icon>[0]["name"]) => (
    <span className="invite-glyph bot-side-glyph" aria-hidden="true">
      <Icon name={name} />
    </span>
  );
  /** Another combined host's group chat: badged, a tap opens it in place (docked) while that host is kept. */
  const otherRoomRow = (other: OtherRoom) => {
    const room = other.kind === "room" ? other.room : copyRoom(other.copy);
    const badge = badgeFor?.(other.host) ?? null;
    return roomRow(
      `${other.host}\u0000${other.kind === "room" ? other.room.roomId : other.copy.id}`,
      <>
        {/* No looks: another host's room looks aren't read, as on the phone (CombinedRoomIcon), so its tile draws that host's bots and not other people's agents. */}
        <RoomFaces room={room} bots={otherBots.filter((o) => o.host === other.host).map((o) => o.bot)} size={22} host={other.host} />
        {badge ? <span className="bot-tile-badge">{<HostBadgeMark badge={badge} />}</span> : null}
      </>,
      room.name,
      other.kind === "copy" ? copyLine(other.copy) : room.updatedAt ? timeLabel(room.updatedAt) : null,
      () => onOpenOtherRoom?.(other),
      { className: other.kind === "copy" && isOver(other.copy) ? "over" : undefined, current: side.openHost === other.host && side.openRoomId === room.roomId },
    );
  };
  const botRow = (tile: MixedTile) => {
    const { bot } = tile;

    const open =
      (side.openHost ? !tile.own && tile.host === side.openHost : tile.own) &&
      !side.openRoomId &&
      !!side.openProfile &&
      side.openProfile.toLowerCase() === bot.name.toLowerCase();
    const picked = tile.own ? (draft?.members.includes(bot.name) ?? false) : draftFar.some((m) => m.key === tile.key);
    const pill = workPill(tile.own ? work?.get(bot.name) : otherWork?.get(keptWorkKey(tile.host, bot.name)));
    const badge = tile.own ? ownBadge : (badgeFor?.(tile.host) ?? null);
    // At work: a ring on the face, and its last line shimmering under the name (Eric, 2026-11-26). Needs you keeps its words.
    const botWork = tile.own ? work?.get(bot.name) : otherWork?.get(keptWorkKey(tile.host, bot.name));
    const needs = pill?.needs ? botWork!.needsYou : 0;
    const busy = !needs && (!!pill || (tile.own && runningProfiles.has(bot.name)));
    const status = pill?.text ?? (busy ? t("Working") : null);
    // The step it's on: the open chat's live step, else another chat's (the plugin's live steps), else its workstream's; never the chat's last message (Eric, 2026-11-26).
    const doingNow =
      (tile.own && liveDoing?.bot.toLowerCase() === bot.name.toLowerCase() ? liveDoing.text : null) || (tile.own ? otherChatsDoing?.get(bot.name) : null) || botWork?.doing || null;
    return (
      <button
        key={tile.key}
        className={`row bot-side-bot${open ? " open" : ""}${picked ? " picked" : ""}${dropTarget === tile.key ? " drop-target" : ""}${moveTarget === tile.key ? " move-target" : ""}`}
        aria-current={open ? "true" : undefined}
        aria-pressed={picked || undefined}
        title={status ? `${bot.title} · ${status}` : undefined}
        onClick={() => {
          if (tile.own) return openOrPick(bot);
          const far = draft ? farOf(tile) : null;
          if (!far) return onOpenOther?.({ host: tile.host, bot });
          if (draftFar.some((m) => m.key === tile.key)) leaveFar(tile.key);
          else joinMixed([], [far]);
        }}
        onContextMenu={tile.own || categories ? openMenu?.(bot, tile) : undefined}
        {...tileDrag(tile)}
      >
        <span className="bot-side-face bot-tile-face">
          <BotAvatar bot={bot} size={30} moving host={tile.own ? undefined : tile.host} />
          {needs || busy ? <WorkRing needs={needs} /> : null}
          {dropTarget === tile.key ? (
            <span className="drop-plus" aria-hidden="true">
              <Icon name="plus" />
            </span>
          ) : null}
          {badge ? <span className="bot-tile-badge">{<HostBadgeMark badge={badge} />}</span> : null}
        </span>
        <span className="bot-side-text">
          <span className="row-title">
            {bot.pinned ? (
              <span className="pin" aria-label={t("Pinned")}>
                •{" "}
              </span>
            ) : null}
            {bot.title}
          </span>
          {needs ? (
            <span className="meta bot-side-pill needs">{pill!.text}</span>
          ) : busy ? (
            <>
              {/* What it's doing now, else Working, shimmering while it works. */}
              <span className="meta bot-side-working">{doingNow || t("Working")}</span>
              {doingNow ? <span className="sr-only">{status}</span> : null}
            </>
          ) : bot.lastLine ? (
            <span className="meta">{bot.lastLine}</span>
          ) : null}
        </span>
      </button>
    );
  };

  const otherRooms = [...otherRoomsBefore, ...otherRoomsAfter];
  // A tap on another dashboard's group chat draws the window afresh: the list opens where it was.
  const scroller = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => botSideScroll.opened(), []);
  useLayoutEffect(() => {
    if (scroller.current) botSideScroll.drew(scroller.current);
  });
  // Other hosts' group chats, and this host's copies (one may wait for your
  // approval), show though this host's rooms aren't read (or can't be).
  const showRooms =
    otherRooms.length > 0 ||
    (copies?.length ?? 0) > 0 ||
    (!!rooms &&
      (rooms.length > 0 || canDrag || !!onNewGroup || (invites?.length ?? 0) > 0 || (copies?.length ?? 0) > 0 || (drafts?.length ?? 0) > 0));
  return (
    <section className={`chatlist bot-side${draft ? " drafting" : ""}`} aria-label={t("Bots")}>
      <div className="chatlist-head bot-side-head">
        <h1>{t("Bots")}</h1>
        <div className="chatlist-search bot-side-search" onMouseDown={(e) => e.currentTarget.querySelector("input")?.focus()}>
          <Icon name="search" />
          <input aria-label={t("Search bots")} value={botQuery} onChange={(e) => setBotQuery(e.target.value)} placeholder={t("Search bots")} />
          {botQuery ? (
            <button className="chatlist-search-clear" aria-label={t("Clear search")} title={t("Clear search")} onClick={() => setBotQuery("")}>
              <Icon name="close" />
            </button>
          ) : null}
        </div>
        {onNewBot ? (
          <button className="round" aria-label={t("New Bot")} title={t("New Bot")} onClick={onNewBot} disabled={busy}>
            <Icon name="plus" />
          </button>
        ) : null}
        {onHide ? <HideListButton onHide={onHide} /> : null}
      </div>
      {notice || actionError ? (
        <p className="error-text bots-notice bot-side-notice">
          {actionError ?? notice}{" "}
          {!actionError && onDismissNotice ? (
            <button className="link" onClick={onDismissNotice}>
              {t("OK")}
            </button>
          ) : null}
        </p>
      ) : null}
      <div
        ref={scroller}
        className="chatlist-scroll"
        onScroll={(e) => botSideScroll.scrolled(e.currentTarget)}
        onWheel={() => botSideScroll.touched()}
        onPointerDown={() => botSideScroll.touched()}
        onKeyDown={() => botSideScroll.touched()}
        {...gridDrop}
      >
        {bots === null && !error ? <div className="empty">{t("Loading your bots…")}</div> : null}
        {error ? <div className="empty">{t("Couldn’t load your bots: {error}", { error })}</div> : null}
        {botQuery && !foundTiles.length && !foundHidden.length ? <div className="empty">{t("No bots match")}</div> : null}
        {sections
          ? sections
              .map((section) => ({ ...section, items: section.items.filter((tile) => matchesBot(tile.bot.name, tile.bot.title, botQuery)) }))
              .filter((section) => section.items.length)
              .map((section) => (
              <Fragment key={section.key}>
                {heading(section)}
                {sectionOpen(folded, section.key, botQuery) ? section.items.map(botRow) : null}
                {sectionOpen(folded, section.key, botQuery) ? roomsIn(section.name).map(ownRoomRow) : null}
              </Fragment>
            ))
          : foundTiles.map(botRow)}
        {showRooms ? (
          <div className="bot-side-section" role="group" aria-label={t("Group chats")} {...roomsGridDrop}>
            <div className="bot-side-section-head">
              <h2>{t("Group chats")}</h2>
              {onNewGroup ? (
                <button className="round small" aria-label={t("New Group Chat")} title={t("New Group Chat")} onClick={onNewGroup}>
                  <Icon name="plus" />
                </button>
              ) : null}
            </div>
            {rooms?.length === 0 && otherRooms.length === 0 && !draft && canDrag ? <p className="meta hint bot-side-hint">{t("Drag one bot onto another to start a group chat.")}</p> : null}
            {otherRoomsBefore.map(otherRoomRow)}
            {(drafts ?? []).map((d) => roomRow(d.id, glyph(d.status === "ended" ? "bell" : "clock"), d.name, draftLine(d), () => onOpenDraft?.(d), { className: `draft-tile ${d.status}` }))}
            {(copies ?? []).map((copy) =>
              roomRow(
                copy.id,
                <RoomFaces room={copyRoom(copy)} bots={bots ?? []} size={22} looks={roomLooks?.[copy.roomId]} />,
                copy.name,
                copiesWaiting?.has(copy.id) ? t("Approval needed") : copyLine(copy),
                () => onOpenCopy?.(copy),
                { className: isOver(copy) ? "over" : undefined, current: !side.openHost && side.openRoomId === copy.roomId, waiting: copiesWaiting?.has(copy.id) },
              ),
            )}
            {(invites ?? [])
              .filter((invite) => !copies?.some((c) => c.id === invite.id))
              .map((invite) =>
                roomRow(
                  invite.id,
                  glyph(invite.status === "waiting" ? "envelope" : invite.status === "joined" ? "clock" : invite.status === "started" ? "check" : "bell"),
                  invite.name,
                  inviteRowLine(invite),
                  () => onOpenInvite?.(invite),
                  { className: `invite-tile ${invite.status}`, waiting: invite.status === "waiting" },
                ),
              )}
            {(rooms ?? []).filter((room) => !sections || !categories?.rooms || !roomCategory(room.roomId)).map(ownRoomRow)}
            {otherRoomsAfter.map(otherRoomRow)}
            {draft ? (
              <div className="row bot-side-bot bot-side-room starting" aria-label={t("Group chat being started")}>
                <span className="bot-side-face">
                  <RoomFaces room={{ members: draft.members.map((m) => ({ memberId: m, profile: m })) }} bots={bots ?? []} size={22} />
                </span>
                <span className="bot-side-text">
                  <span className="row-title">{draft.name.trim() || t("New room")}</span>
                </span>
              </div>
            ) : null}
          </div>
        ) : null}
        {foundHidden.length > 0 ? (
          <div className="bot-side-section bots-hidden">
            <button className="link bot-side-hidden" aria-expanded={showHidden || !!botQuery} onClick={() => !botQuery && setShowHidden(!showHidden)}>
              {t("Hidden")} ({foundHidden.length})
            </button>
            {showHidden || botQuery
              ? foundHidden.map((bot) => (
                  <div key={bot.name} className="row bot-side-bot hidden-row">
                    <span className="bot-side-face">
                      <BotAvatar bot={bot} size={30} moving />
                    </span>
                    <span className="bot-side-text">
                      <span className="row-title">{bot.title}</span>
                    </span>
                    {onAction ? (
                      <button className="secondary" disabled={busy} onClick={() => act("show", bot)}>
                        {t("Unhide")}
                      </button>
                    ) : null}
                  </div>
                ))
              : null}
          </div>
        ) : null}
      </div>
      {draftForm}
      {menuEl}
    </section>
  );

}
