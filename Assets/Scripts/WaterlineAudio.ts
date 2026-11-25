/**
 * WaterlineAudio — one-shot cues placed in the room: tag pop, safe tick, splash, mains click,
 * morning birds.
 *
 * Owns: a small pool of spatial one-shot emitters (LowLatency for interaction cues) and the
 * birds bed. Must not: decide when cues play (WaterlineMain / WaterlineGuidance do).
 */

@component
export class WaterlineAudio extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">WaterlineAudio – placed one-shot cues</span>')
  @ui.separator
  @ui.group_start("References")
  @input
  @hint("Soft pop when a belonging is tagged")
  tagPop!: AudioTrackAsset
  @input
  @hint("Soft tick when an item snaps onto its safe spot")
  safeTick!: AudioTrackAsset
  @input
  @hint("Soft splash from the next item's direction")
  splash!: AudioTrackAsset
  @input
  @hint("Mains switch click")
  switchClick!: AudioTrackAsset
  @input
  @hint("Morning birds after the water drains")
  birds!: AudioTrackAsset
  @ui.group_end
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Volume of the one-shot cues")
  @widget(new SliderWidget(0, 1, 0.05))
  cueVolume: number = 0.9
  @input
  @hint("Volume of the morning birds")
  @widget(new SliderWidget(0, 1, 0.05))
  birdsVolume: number = 0.7
  @ui.group_end

  private pool: {so: SceneObject; ac: AudioComponent}[] = []
  private next = 0
  private birdsAc!: AudioComponent
  private lastPlayed: {[k: string]: number} = {}

  onAwake() {
    for (let i = 0; i < 6; i++) {
      const so = global.scene.createSceneObject(`Cue${i}`)
      so.setParent(this.getSceneObject())
      const ac = so.createComponent("Component.AudioComponent") as AudioComponent
      ac.playbackMode = Audio.PlaybackMode.LowLatency
      try {
        ac.spatialAudio.enabled = true
      } catch (e) {
        // non-spatial fallback
      }
      this.pool.push({so, ac})
    }
    const b = global.scene.createSceneObject("Birds")
    b.setParent(this.getSceneObject())
    this.birdsAc = b.createComponent("Component.AudioComponent") as AudioComponent
    this.birdsAc.audioTrack = this.birds
    this.birdsAc.volume = this.birdsVolume
  }

  playTagPop(at: vec3): void { this.playAt("tag", this.tagPop, at) }
  playSafeTick(at: vec3): void { this.playAt("tick", this.safeTick, at) }
  playSplash(at: vec3): void { this.playAt("splash", this.splash, at) }
  playSwitchClick(at: vec3): void { this.playAt("click", this.switchClick, at) }

  playBirds(at: vec3): void {
    this.birdsAc.getSceneObject().getTransform().setWorldPosition(at)
    this.birdsAc.volume = this.birdsVolume
    this.birdsAc.play(1)
    this.lastPlayed["birds"] = getTime()
  }

  /** getTime() of the last time a cue played (tests read this). */
  lastPlayedAt(key: string): number { return this.lastPlayed[key] ?? -1 }

  private playAt(key: string, track: AudioTrackAsset, at: vec3): void {
    const e = this.pool[this.next]
    this.next = (this.next + 1) % this.pool.length
    e.so.getTransform().setWorldPosition(at)
    if (e.ac.isPlaying()) e.ac.stop(false)
    e.ac.audioTrack = track
    e.ac.volume = this.cueVolume
    e.ac.play(1)
    this.lastPlayed[key] = getTime()
  }
}
