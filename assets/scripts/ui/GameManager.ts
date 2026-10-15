import { _decorator, Component, Node, UITransform, Label, tween, Vec3, assetManager, Sprite, SpriteFrame } from 'cc';
import { Bottle, Bag, ColorKey, LevelConfig, MoveHistoryItem } from '../core/types';
import {
  canSelectBottle,
  canSelectBottleNoToast,
  canPourInto,
  getPourableCount,
  pickNextNeededBagColor,
  checkGameWon,
  isCompleteBottle,
} from '../core/waterSortLogic';
import { getLevelConfig } from '../core/levelGenerator';
import { COLORS } from '../core/colors';
import { GameBoard } from './GameBoard';
import { WaterStream } from './WaterStream';


// 4x Retina 高保真 UI 视觉资产 UUID 表
const UI_ASSET_UUIDS = {
  btnSettings: '1ae13f00-daf7-42f7-b70d-3bb84a725891@f9941',
  btnPower: 'd01f6581-c226-428d-b9d0-0be21119a342@f9941',
  levelPill: '9b543135-bf6d-4a99-af58-dc032e2d4343@f9941',
  badgeRed1: '6502b239-5c1a-42bf-8019-dd68055c46ab@f9941',
  badgeVideo: '3024b34c-d827-4621-8f89-524a0904e8f4@f9941',
  bagRed: '2d33f627-93cd-47dc-b9a0-3bedbece8417@f9941',
  bagYellow: 'e2878a3e-c9ca-4611-a762-2a9a963a9a6a@f9941',
  bagBlue: '2c81d24f-0614-42f6-b738-e8121537e898@f9941',
  bagVideo: '554f59c8-6d68-4290-a832-dac372357192@f9941',
};

const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {
  @property(GameBoard)
  public gameBoard: GameBoard = null!;

  @property(WaterStream)
  public waterStream: WaterStream = null!;

  private _currentLevelNum: number = 1;
  private _currentCfg: LevelConfig = null!;
  private _bottles: Bottle[] = [];
  private _bags: Bag[] = [];
  private _packedTotal: number = 0;
  private _pourCountTotal: number = 0;
  private _remainingMoves: number | null = null;
  private _selectedIndex: number | null = null;
  private _isBusy: boolean = false;
  private _history: MoveHistoryItem[] = [];

  // UI 节点引用
  private _shoppingBagsNode: Node | null = null;
  private _modeBannerNode: Node | null = null;
  private _modeBannerTextLabel: Label | null = null;
  private _modeBannerProgressLabel: Label | null = null;
  private _levelLabel: Label | null = null;
  private _movesLabel: Label | null = null;

  onLoad() {
    this.autoBindDependencies();
  }

  start() {
    console.log('[GameManager] 启动星光琉璃工坊引擎...');
    this.autoBindDependencies();
    this.setupButtons();
    this.loadLevel(7);
  }

  private autoBindDependencies() {
    if (!this.gameBoard) {
      const gbNode = this.node.getChildByName('GameBoard');
      if (gbNode) {
        this.gameBoard = gbNode.getComponent(GameBoard) || gbNode.addComponent(GameBoard);
      }
    }
    if (!this.waterStream) {
      const wsNode = this.node.getChildByName('WaterStream');
      if (wsNode) {
        this.waterStream = wsNode.getComponent(WaterStream) || wsNode.addComponent(WaterStream);
      }
    }
    if (!this._shoppingBagsNode) {
      this._shoppingBagsNode = this.node.getChildByName('ShoppingBags');
    }
    if (!this._modeBannerNode) {
      this._modeBannerNode = this.node.getChildByName('ModeBanner');
    }

    this.setupHighFidelityHeader();
    this.setupHighFidelityFooter();
    this.setupHighFidelityBags();

    if (this._modeBannerNode) {
      const txtNode = this._modeBannerNode.getChildByName('BannerText');
      this._modeBannerTextLabel = txtNode?.getComponent(Label) || null;
      const progNode = this._modeBannerNode.getChildByName('BannerProgress');
      this._modeBannerProgressLabel = progNode?.getComponent(Label) || null;
    }
  }

  /**
   * 100% 对标 HTML .top-bar 高定果冻琉璃导航栏
   */
  private setupHighFidelityHeader() {
    const header = this.node.getChildByName('Header');
    if (!header) return;

    // 1. 左侧齿轮设置按钮 (BtnSettings)
    let btnSettings = header.getChildByName('BtnSettings');
    if (!btnSettings) {
      btnSettings = new Node('BtnSettings');
      btnSettings.layer = header.layer;
      btnSettings.setParent(header);
    }
    btnSettings.setPosition(-155, 0, 0);
    const setTrans = btnSettings.getComponent(UITransform) || btnSettings.addComponent(UITransform);
    setTrans.setContentSize(42, 42);
    const setSp = btnSettings.getComponent(Sprite) || btnSettings.addComponent(Sprite);
    setSp.sizeMode = Sprite.SizeMode.CUSTOM;
    assetManager.loadAny(UI_ASSET_UUIDS.btnSettings, (err, sf: SpriteFrame) => {
      if (!err && sf && setSp.isValid) setSp.spriteFrame = sf;
    });
    btnSettings.off(Node.EventType.TOUCH_END);
    btnSettings.on(Node.EventType.TOUCH_END, () => {
      this.bounceButton(btnSettings!);
      console.log('[Header] 点击工坊荣誉设置面板');
    });

    // 2. 右侧能量闪电按钮 (BtnPower)
    let btnPower = header.getChildByName('BtnPower');
    if (!btnPower) {
      btnPower = new Node('BtnPower');
      btnPower.layer = header.layer;
      btnPower.setParent(header);
    }
    btnPower.setPosition(155, 0, 0);
    const pwrTrans = btnPower.getComponent(UITransform) || btnPower.addComponent(UITransform);
    pwrTrans.setContentSize(42, 42);
    const pwrSp = btnPower.getComponent(Sprite) || btnPower.addComponent(Sprite);
    pwrSp.sizeMode = Sprite.SizeMode.CUSTOM;
    assetManager.loadAny(UI_ASSET_UUIDS.btnPower, (err, sf: SpriteFrame) => {
      if (!err && sf && pwrSp.isValid) pwrSp.spriteFrame = sf;
    });
    btnPower.off(Node.EventType.TOUCH_END);
    btnPower.on(Node.EventType.TOUCH_END, () => {
      this.bounceButton(btnPower!);
      console.log('[Header] 点击闪电能量：快捷解除全场封印！');
      this.handleQuickUnlockAll();
    });

    // 3. 中间琉璃发光圆角胶囊底座 (LevelPill)
    let pillNode = header.getChildByName('LevelPill');
    if (!pillNode) {
      pillNode = new Node('LevelPill');
      pillNode.layer = header.layer;
      pillNode.setParent(header);
      pillNode.setSiblingIndex(0);
    }
    pillNode.setPosition(0, 0, 0);
    const pillTrans = pillNode.getComponent(UITransform) || pillNode.addComponent(UITransform);
    pillTrans.setContentSize(136, 38);
    const pillSp = pillNode.getComponent(Sprite) || pillNode.addComponent(Sprite);
    pillSp.sizeMode = Sprite.SizeMode.CUSTOM;
    assetManager.loadAny(UI_ASSET_UUIDS.levelPill, (err, sf: SpriteFrame) => {
      if (!err && sf && pillSp.isValid) pillSp.spriteFrame = sf;
    });
    pillNode.off(Node.EventType.TOUCH_END);
    pillNode.on(Node.EventType.TOUCH_END, () => {
      this.bounceButton(pillNode!);
      this.handleNextLevelCheat();
    });

    // 4. 关卡文字置于胶囊中央
    let lblNode = header.getChildByName('LevelLabel');
    if (lblNode) {
      lblNode.setPosition(0, 0, 0);
      this._levelLabel = lblNode.getComponent(Label);
      if (this._levelLabel) {
        this._levelLabel.fontSize = 17;
        this._levelLabel.lineHeight = 20;
        this._levelLabel.isBold = true;
      }
    }

    const movesNode = header.getChildByName('MovesLabel');
    this._movesLabel = movesNode?.getComponent(Label) || null;
  }

  /**
   * 100% 对标 HTML 底部 4 大道具栏带右上角果冻角标
   */
  private setupHighFidelityFooter() {
    const footer = this.node.getChildByName('Footer');
    if (!footer) return;

    // 1. 提示按钮挂载红底白字 1 角标
    const shuffleBtn = footer.getChildByName('BtnShuffle');
    if (shuffleBtn) {
      this.ensureButtonBadge(shuffleBtn, UI_ASSET_UUIDS.badgeRed1, 24, 22);
    }

    // 2. +空瓶按钮挂载紫色 🎬 视频角标
    const addBtn = footer.getChildByName('BtnAddBottle');
    if (addBtn) {
      this.ensureButtonBadge(addBtn, UI_ASSET_UUIDS.badgeVideo, 26, 22);
    }

    // 3. 撤回按钮挂载紫色 🎬 视频角标
    const undoBtn = footer.getChildByName('BtnUndo');
    if (undoBtn) {
      this.ensureButtonBadge(undoBtn, UI_ASSET_UUIDS.badgeVideo, 26, 22);
    }
  }

  private ensureButtonBadge(btnNode: Node, uuid: string, w: number, h: number) {
    let badge = btnNode.getChildByName('JellyBadge');
    if (!badge) {
      badge = new Node('JellyBadge');
      badge.layer = btnNode.layer;
      badge.setParent(btnNode);
    }
    badge.setPosition(25, 25, 0);
    const trans = badge.getComponent(UITransform) || badge.addComponent(UITransform);
    trans.setContentSize(w, h);
    const sp = badge.getComponent(Sprite) || badge.addComponent(Sprite);
    sp.sizeMode = Sprite.SizeMode.CUSTOM;
    assetManager.loadAny(uuid, (err, sf: SpriteFrame) => {
      if (!err && sf && sp.isValid) sp.spriteFrame = sf;
    });
  }

  /**
   * 100% 对标 HTML 顶部 4 个 3D 礼盒购物袋 (红、黄、蓝、视频)
   */
  private setupHighFidelityBags() {
    if (!this._shoppingBagsNode) return;
    this._shoppingBagsNode.setPosition(0, 415, 0);

    const bagConfigs = [
      { name: 'Bag_1_Yellow', x: -126, uuid: UI_ASSET_UUIDS.bagRed },
      { name: 'Bag_2_Purple', x: -42,  uuid: UI_ASSET_UUIDS.bagYellow },
      { name: 'Bag_3_Blue',   x: 42,   uuid: UI_ASSET_UUIDS.bagBlue },
      { name: 'Bag_4_Video',  x: 126,  uuid: UI_ASSET_UUIDS.bagVideo },
    ];

    bagConfigs.forEach(cfg => {
      const node = this._shoppingBagsNode!.getChildByName(cfg.name);
      if (node) {
        node.setPosition(cfg.x, 0, 0);
        const trans = node.getComponent(UITransform) || node.addComponent(UITransform);
        trans.setContentSize(72, 90);
        const sp = node.getComponent(Sprite) || node.addComponent(Sprite);
        sp.sizeMode = Sprite.SizeMode.CUSTOM;
        assetManager.loadAny(cfg.uuid, (err, sf: SpriteFrame) => {
          if (!err && sf && sp.isValid) {
            sp.spriteFrame = sf;
            trans.setContentSize(72, 90);
          }
        });
      }
    });
  }

  /**
   * 快捷解除当前关卡所有封印 (对标 HTML quick-unlock-btn)
   */
  private handleQuickUnlockAll() {
    this._history.push(this.cloneState());
    for (const b of this._bottles) {
      if (b.special === 'silk_drape' || b.special === 'full_ice' || b.special === 'paper_bag') {
        b.special = 'none';
      }
      if (b.poursRemaining) b.poursRemaining = 0;
      if (b.mysteryCount) b.mysteryCount = 0;
    }
    if (this.gameBoard) {
      this.gameBoard.init(this._bottles, (idx) => this.handleTubeClick(idx));
    }
  }

  private setupButtons() {
    const footer = this.node.getChildByName('Footer');
    if (!footer) return;

    // 1. 提示按钮
    const shuffleBtn = footer.getChildByName('BtnShuffle');
    if (shuffleBtn) {
      shuffleBtn.off(Node.EventType.TOUCH_END);
      shuffleBtn.on(Node.EventType.TOUCH_END, () => {
        this.bounceButton(shuffleBtn);
        this.handleShuffle();
      });
    }

    // 2. +空瓶/破除封印按钮
    let addBtn = footer.getChildByName('BtnAddBottle');
    if (addBtn) {
      addBtn.off(Node.EventType.TOUCH_END);
      addBtn.on(Node.EventType.TOUCH_END, () => {
        this.bounceButton(addBtn);
        this.handleAddBottle();
      });
    }

    // 3. 关卡选择按钮
    let levelBtn = footer.getChildByName('BtnLevel');
    if (levelBtn) {
      levelBtn.off(Node.EventType.TOUCH_END);
      levelBtn.on(Node.EventType.TOUCH_END, () => {
        this.bounceButton(levelBtn);
        this.handleNextLevelCheat();
      });
    }

    // 4. 撤回按钮
    const undoBtn = footer.getChildByName('BtnUndo');
    if (undoBtn) {
      undoBtn.off(Node.EventType.TOUCH_END);
      undoBtn.on(Node.EventType.TOUCH_END, () => {
        this.bounceButton(undoBtn);
        this.handleUndo();
      });
    }
  }

  private bounceButton(btnNode: Node) {
    tween(btnNode)
      .to(0.08, { scale: new Vec3(0.88, 0.88, 1) })
      .to(0.12, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
      .start();
  }

  public loadLevel(levelNum: number) {
    this._currentLevelNum = Math.max(1, Math.min(200, levelNum));
    this._currentCfg = getLevelConfig(this._currentLevelNum);
    console.log(`[GameManager] 加载试炼：${this._currentCfg.title} (${this._currentCfg.shortTag})`);

    this._bottles = this._currentCfg.bottles();
    this._bags = this._currentCfg.hasBags ? JSON.parse(JSON.stringify(this._currentCfg.bags)) : [];
    this._packedTotal = 0;
    this._pourCountTotal = 0;
    this._remainingMoves = this._currentCfg.moveLimit;
    this._history = [];
    this._selectedIndex = null;
    this._isBusy = false;

    // 1. 顶部标题与步数刷新
    if (this._levelLabel) {
      this._levelLabel.string = `第 ${this._currentLevelNum} 关`;
    }
    this.updateMovesDisplay();

    // 2. 双模式 UI 切换
    if (this._shoppingBagsNode) {
      this._shoppingBagsNode.active = !!this._currentCfg.hasBags;
    }
    if (this._modeBannerNode) {
      this._modeBannerNode.active = !this._currentCfg.hasBags;
    }
    this.updateModeBanner();

    // 3. 棋盘瓶子初始化
    if (this.gameBoard) {
      this.gameBoard.init(this._bottles, (idx) => this.handleTubeClick(idx));
    }
  }

  private updateMovesDisplay() {
    if (!this._movesLabel) return;
    if (this._remainingMoves !== null) {
      this._movesLabel.node.active = true;
      this._movesLabel.string = `✨ 步数 ${this._remainingMoves}`;
    } else {
      this._movesLabel.node.active = false;
    }
  }

  private updateModeBanner() {
    if (!this._currentCfg || this._currentCfg.hasBags) return;

    if (this._currentCfg.isCatBossLevel) {
      const catBottle = this._bottles.find((b) => b.isGiantCat);
      const curLayers = catBottle ? catBottle.layers.length : 0;
      const catColName = COLORS[(catBottle && catBottle.catTargetColor) || 'pink'].name;
      if (this._modeBannerTextLabel) {
        this._modeBannerTextLabel.string = `🐱 皇家典藏：请将 8 层【${catColName}】汇入中央灵猫水晶瓶`;
      }
      if (this._modeBannerProgressLabel) {
        this._modeBannerProgressLabel.string = `凝萃 ${curLayers}/8`;
      }
    } else {
      const corkedCnt = this._bottles.filter((b) => b.corked).length;
      const totalTargets = this._bottles.filter((b) => b.layers.length > 0).length;
      if (this._modeBannerTextLabel) {
        this._modeBannerTextLabel.string = `✨ 琉璃工坊：凝萃同色秘药，满瓶即落原木塞封存`;
      }
      if (this._modeBannerProgressLabel) {
        this._modeBannerProgressLabel.string = `封存 ${corkedCnt}/${totalTargets}`;
      }
    }
  }

  private cloneState(): MoveHistoryItem {
    return {
      bottles: JSON.parse(JSON.stringify(this._bottles)),
      bags: JSON.parse(JSON.stringify(this._bags)),
      packedTotal: this._packedTotal,
      pourCountTotal: this._pourCountTotal,
      remainingMoves: this._remainingMoves,
      shuffleUses: 1,
    };
  }

  public async handleTubeClick(index: number) {
    if (this._isBusy) return;
    const bottle = this._bottles[index];
    if (!bottle || bottle.removed || bottle.corked) return;

    // 1. 摄像机广告空瓶解锁
    if (bottle.special === 'ad_cam' || bottle.special === 'ad_cam_blue') {
      this._history.push(this.cloneState());
      bottle.special = 'none';
      const tube = this.gameBoard.getTube(index);
      if (tube) tube.updateBadgeState();
      console.log(`[GameManager] 已免费开启第 ${index} 号备用琉璃瓶！`);
      return;
    }

    // 2. 首选瓶子提起
    if (this._selectedIndex === null) {
      if (canSelectBottle(bottle, (msg) => console.log(msg))) {
        this._selectedIndex = index;
        const tube = this.gameBoard.getTube(index);
        if (tube) tube.setSelected(true);
      }
      return;
    }

    // 3. 点击同一瓶放下
    if (this._selectedIndex === index) {
      const tube = this.gameBoard.getTube(index);
      if (tube) tube.setSelected(false);
      this._selectedIndex = null;
      return;
    }

    // 4. 执行倒水判定
    const sourceIdx = this._selectedIndex;
    const targetIdx = index;
    const sourceBottle = this._bottles[sourceIdx];
    const targetBottle = this._bottles[targetIdx];

    if (canPourInto(sourceBottle, targetBottle)) {
      await this.performPour(sourceIdx, targetIdx);
    } else {
      const prevTube = this.gameBoard.getTube(sourceIdx);
      if (prevTube) prevTube.setSelected(false);

      if (canSelectBottle(targetBottle)) {
        this._selectedIndex = targetIdx;
        const nextTube = this.gameBoard.getTube(targetIdx);
        if (nextTube) nextTube.setSelected(true);
      } else {
        this._selectedIndex = null;
      }
    }
  }

  private async performPour(sourceIdx: number, targetIdx: number) {
    this._isBusy = true;
    this._history.push(this.cloneState());
    this._pourCountTotal++;

    const sourceTube = this.gameBoard.getTube(sourceIdx)!;
    const targetTube = this.gameBoard.getTube(targetIdx)!;
    const sourceBottle = this._bottles[sourceIdx];
    const targetBottle = this._bottles[targetIdx];

    const moveCount = getPourableCount(sourceBottle, targetBottle);
    const pourColor = sourceBottle.layers[sourceBottle.layers.length - 1];

    // 1. 源瓶飞行移至目标瓶上方
    const targetWorldPos = targetTube.node.worldPosition.clone();
    await sourceTube.playPourTo(targetWorldPos);

    // 2. 发射高奢流体水流与入水激荡特效
    const isTargetRight = targetWorldPos.x >= sourceTube.node.worldPosition.x;
    const srcTrans = sourceTube.node.getComponent(UITransform)!;
    const dstTrans = targetTube.node.getComponent(UITransform)!;

    // 出水嘴精确对准倾斜瓶口边缘
    const spoutPos = srcTrans.convertToWorldSpaceAR(new Vec3(isTargetRight ? 26 : -26, 58, 0));
    // 目标瓶口中心
    const mouthPos = dstTrans.convertToWorldSpaceAR(new Vec3(0, 52, 0));

    // 计算目标瓶内实际液面位置 (深入试管内部直达液面，彻底告别悬空)
    const dstCap = targetBottle.maxCap || (targetBottle.isGiantCat ? 8 : 4);
    const dstLayers = targetBottle.layers.length;
    const surfaceLocalY = -72 + (dstLayers + 0.25) * (114 / dstCap);
    const surfacePos = dstTrans.convertToWorldSpaceAR(new Vec3(0, surfaceLocalY, 0));

    if (this.waterStream) {
      (this.waterStream as any).startPour(spoutPos, mouthPos, surfacePos, pourColor, moveCount);
    }

    // 3. 源瓶扣水 & 目标瓶注水
    const animDuration = 0.4 + (moveCount - 1) * 0.12;
    await Promise.all([
      sourceTube.animateDrainTopLayer(moveCount, animDuration),
      targetTube.animateRiseNewLayer(pourColor, moveCount, animDuration),
    ]);

    // 4. 数据更新
    for (let k = 0; k < moveCount; k++) {
      sourceBottle.layers.pop();
      targetBottle.layers.push(pourColor);
    }

    // 5. 水流停止，源瓶平滑复位
    if (this.waterStream) {
      this.waterStream.stopPour();
    }
    await sourceTube.playReturn();

    sourceTube.renderLayers();
    targetTube.renderLayers();
    this._selectedIndex = null;

    // 6. 盲盒层揭晓判定
    if (sourceBottle.mysteryCount && sourceBottle.mysteryCount > 0 && sourceBottle.layers.length <= sourceBottle.mysteryCount) {
      sourceBottle.mysteryCount = Math.max(0, sourceBottle.layers.length - 1);
      sourceTube.renderLayers();
      console.log(`✨ 星雾散尽：显露下一层秘药真彩！`);
    }

    // 7. 底座共振敲击判定 (霜晶/曜石)
    this._bottles.forEach((b, bIdx) => {
      if (!b.removed && (b.special === 'ice_base' || b.special === 'stone_base') && b.poursToBreak) {
        b.poursToBreak--;
        const tube = this.gameBoard.getTube(bIdx);
        if (b.poursToBreak <= 0) {
          b.special = 'none';
        }
        if (tube) tube.updateSpecialVisuals();
      }
    });

    // 8. 步数递减
    if (this._remainingMoves !== null) {
      this._remainingMoves--;
      this.updateMovesDisplay();
    }

    // 9. 满瓶封存与双模式分支
    if (isCompleteBottle(targetBottle)) {
      await this.handleCompletedBottle(targetIdx, pourColor);
    }

    this.updateModeBanner();

    // 10. 通关检测
    if (targetBottle.isGiantCat || checkGameWon(this._bottles, targetBottle.isGiantCat)) {
      console.log(`🏆 完美通关！本次用步: ${this._pourCountTotal}，理论最优解: ${this._currentCfg.optimalMoves}`);
      setTimeout(() => {
        this.loadLevel(this._currentLevelNum + 1);
      }, 1000);
    }

    this._isBusy = false;
  }

  private async handleCompletedBottle(targetIdx: number, colorKey: ColorKey) {
    const targetBottle = this._bottles[targetIdx];
    const tubeView = this.gameBoard.getTube(targetIdx)!;

    targetBottle.corked = true;
    tubeView.updateCorkState();

    if (this._currentCfg.hasBags) {
      // 礼盒模式：落木塞后飞入购物袋
      await tubeView.playCorkDropAnimation();
      this._packedTotal++;
      this.unlockBagOrderObstacles();

      const bagNode = this.getMatchingShoppingBag(colorKey);
      const targetPos = bagNode ? bagNode.worldPosition : new Vec3(0, 320, 0);
      await tubeView.playFlyToBag(targetPos);
      targetBottle.removed = true;
      if (bagNode) this.animateBagGulp(bagNode);
    } else {
      // 直通凝萃模式：原地落木塞，微震封存，不飞袋
      await tubeView.playCorkDropAnimation();
      this._packedTotal++;
      this.unlockBagOrderObstacles();
      console.log(`✨ 秘药圆满归宗，已就地落原木塞封存！`);
    }
  }

  private unlockBagOrderObstacles() {
    this._bottles.forEach((b, bIdx) => {
      if (
        !b.removed &&
        ['silk_drape', 'full_ice', 'paper_bag'].includes(b.special) &&
        this._packedTotal >= (b.unlockOrder || 1)
      ) {
        b.special = 'none';
        const tube = this.gameBoard.getTube(bIdx);
        if (tube) tube.updateSpecialVisuals();
        console.log(`🧣 礼盒契约达成：封印已解除！`);
      }
    });
  }

  private getMatchingShoppingBag(colorKey: ColorKey): Node | null {
    if (!this._shoppingBagsNode) return null;
    const bagMap: Record<string, string> = {
      yellow: 'Bag_1_Yellow',
      green: 'Bag_1_Yellow',
      purple: 'Bag_2_Purple',
      pink: 'Bag_2_Purple',
      blue: 'Bag_3_Blue',
      cyan: 'Bag_3_Blue',
      orange: 'Bag_1_Yellow',
      red: 'Bag_4_Video',
    };
    const bagName = bagMap[colorKey] || 'Bag_1_Yellow';
    return this._shoppingBagsNode.getChildByName(bagName) || this._shoppingBagsNode.children[0] || null;
  }

  private animateBagGulp(bagNode: Node) {
    tween(bagNode)
      .to(0.12, { scale: new Vec3(1.25, 1.25, 1) }, { easing: 'quadOut' })
      .to(0.12, { scale: new Vec3(0.92, 0.92, 1) }, { easing: 'quadIn' })
      .to(0.08, { scale: new Vec3(1.0, 1.0, 1) })
      .start();
  }

  // 1. 提示按钮逻辑
  private handleShuffle() {
    if (this._isBusy) return;

    for (let i = 0; i < this._bottles.length; i++) {
      const src = this._bottles[i];
      if (!canSelectBottleNoToast(src)) continue;
      for (let j = 0; j < this._bottles.length; j++) {
        if (i === j) continue;
        const dst = this._bottles[j];
        if (canPourInto(src, dst) && dst.layers.length > 0) {
          console.log(`💡 工坊推演：从第 ${i} 瓶倒入第 ${j} 瓶！`);
          this.handleTubeClick(i);
          setTimeout(() => this.handleTubeClick(j), 200);
          return;
        }
      }
    }

    for (let i = 0; i < this._bottles.length; i++) {
      const src = this._bottles[i];
      if (!canSelectBottleNoToast(src) || new Set(src.layers).size <= 1) continue;
      for (let j = 0; j < this._bottles.length; j++) {
        if (i === j) continue;
        const dst = this._bottles[j];
        if (canPourInto(src, dst) && dst.layers.length === 0) {
          console.log(`💡 工坊推演：先腾挪顶层至空瓶！`);
          this.handleTubeClick(i);
          setTimeout(() => this.handleTubeClick(j), 200);
          return;
        }
      }
    }
  }

  // 2. +空瓶/破除封印按钮逻辑
  private handleAddBottle() {
    if (this._isBusy) return;
    this._history.push(this.cloneState());

    if (this._remainingMoves !== null && this._remainingMoves <= 3) {
      this._remainingMoves += 5;
      this.updateMovesDisplay();
      console.log('🎬 激励视频奖励：已为您延长 +5 步星晷步数！');
      return;
    }

    const adBottle = this._bottles.find((b) => !b.removed && (b.special === 'ad_cam' || b.special === 'ad_cam_blue'));
    if (adBottle) {
      adBottle.special = 'none';
      const tube = this.gameBoard.getTube(adBottle.id);
      if (tube) tube.updateBadgeState();
      console.log('🎬 激励视频奖励：已免费开启 +1 备用琉璃空瓶！');
      return;
    }

    const lockedIdx = this._bottles.findIndex(
      (b) => !b.removed && !b.corked && (b.special !== 'none' || (b.mysteryCount && b.mysteryCount > 0))
    );
    if (lockedIdx !== -1) {
      const lockedBottle = this._bottles[lockedIdx];
      lockedBottle.special = 'none';
      lockedBottle.mysteryCount = 0;
      const tube = this.gameBoard.getTube(lockedIdx);
      if (tube) {
        tube.updateSpecialVisuals();
        tube.renderLayers();
      }
      console.log('🎬 激励视频奖励：已解除一处器皿封印！');
    }
  }

  // 3. 关卡快速切换
  private handleNextLevelCheat() {
    if (this._isBusy) return;
    const nextLv = (this._currentLevelNum % 200) + 1;
    this.loadLevel(nextLv);
  }

  // 4. 撤回按钮逻辑
  private handleUndo() {
    if (this._isBusy || this._history.length === 0) return;
    const last = this._history.pop();
    if (last) {
      this._bottles = last.bottles;
      this._bags = last.bags;
      this._packedTotal = last.packedTotal;
      this._pourCountTotal = last.pourCountTotal;
      this._remainingMoves = last.remainingMoves;
      this._selectedIndex = null;
      this.updateMovesDisplay();
      this.updateModeBanner();
      if (this.gameBoard) {
        this.gameBoard.init(this._bottles, (idx) => this.handleTubeClick(idx));
      }
      console.log('↩️ 已为您回溯至上一步');
    }
  }
}
