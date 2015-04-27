package org.pathwaycommons.pathwaycards.nlp

import java.io._

import edu.arizona.sista.odin.domains.bigmechanism.dryrun2015._
import edu.arizona.sista.odin.{EventMention, Mention}
import edu.arizona.sista.processors.Document
import edu.arizona.sista.processors.bionlp.BioNLPProcessor

/**
 * Modified version of edu.arizona.sista.odin.domains.bigmechanism.dryrun2015.DARPAoutput.scala
 */
object MentionExtractor extends App {

  def getText(fileName: String):String = scala.io.Source.fromFile(fileName).mkString

  def printMentions(extractor: Ruler, doc: Document, out: PrintStream): Unit = {

    val header = s"Mention Count;Relation;Model Link (BioPax or BEL);‘English-like’ Description;Model Representation;Source Text\n"

    out.print(header)

    val mentions: Map[String, Seq[EventMention]] =
      retrieveMentions(extractor, doc).groupBy(m => m.repr)

    mentions.foreach(pair => writeEvents(pair._1, pair._2, out))
  }

  def retrieveMentions(extractor: Ruler, doc: Document): Seq[EventMention] = {
    extractor.extractFrom(doc).filter(_.isInstanceOf[EventMention]).map(_.asInstanceOf[EventMention])
  }

  def cleanText(m: Mention): String = {
    """(\s+|\n|\t|[;])""".r.replaceAllIn(m.document.sentences(m.sentence).getSentenceText(), " ")
  }

  def writeEvents(representation: String, mentions: Seq[EventMention], output: PrintStream) {
    def getText: String = {
      mentions.sortBy(m => (m.sentence, m.start)) // sort by sentence, start idx
        .map(m => cleanText(m)) // get text
        .mkString("  ")
    }
    output.print(s"${mentions.size};;;;$representation;$getText\n")
  }
}
