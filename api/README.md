#Index

**Classes**

* [class: CircularBuffer](#CircularBuffer)
  * [new CircularBuffer(initialSize)](#new_CircularBuffer)
* [class: Codec](#Codec)
  * [new Codec()](#new_Codec)
  * [codec._isInteger(n)](#Codec#_isInteger)
  * [codec._readFullValue(buf, [offset], [doNotConsume])](#Codec#_readFullValue)
  * [codec.decode(buf, [offset])](#Codec#decode)
  * [codec.encode(val, buf, [forceType])](#Codec#encode)
* [class: Connection](#Connection)
  * [new Connection()](#new_Connection)
* [class: DescribedType](#DescribedType)
  * [new DescribedType(descriptor, value)](#new_DescribedType)
* [class: AttachFrame](#AttachFrame)
  * [new AttachFrame()](#new_AttachFrame)
* [class: BeginFrame](#BeginFrame)
  * [new BeginFrame()](#new_BeginFrame)
* [class: CloseFrame](#CloseFrame)
  * [new CloseFrame()](#new_CloseFrame)
* [class: DetachFrame](#DetachFrame)
  * [new DetachFrame()](#new_DetachFrame)
* [class: DispositionFrame](#DispositionFrame)
  * [new DispositionFrame()](#new_DispositionFrame)
* [class: EndFrame](#EndFrame)
  * [new EndFrame()](#new_EndFrame)
* [class: FlowFrame](#FlowFrame)
  * [new FlowFrame()](#new_FlowFrame)
* [class: Frame](#Frame)
  * [new Frame()](#new_Frame)
  * [frame.outgoing()](#Frame#outgoing)
  * [frame.readPerformative(describedType)](#Frame#readPerformative)
* [class: AMQPFrame](#AMQPFrame)
  * [new AMQPFrame()](#new_AMQPFrame)
  * [aMQPFrame._getPerformative()](#AMQPFrame#_getPerformative)
  * [aMQPFrame._getAdditionalPayload()](#AMQPFrame#_getAdditionalPayload)
* [class: OpenFrame](#OpenFrame)
  * [new OpenFrame()](#new_OpenFrame)
* [class: TransferFrame](#TransferFrame)
  * [new TransferFrame()](#new_TransferFrame)
* [class: Types](#Types)
  * [new Types()](#new_Types)
  * [types._listBuilder()](#Types#_listBuilder)
  * [types._arrayBuilder()](#Types#_arrayBuilder)
  * [types._mapBuilder()](#Types#_mapBuilder)
  * [types._initTypesArray()](#Types#_initTypesArray)
  * [types._initEncodersDecoders()](#Types#_initEncodersDecoders)

**Functions**

* [encoder(val, buf, [codec])](#encoder)
* [decoder(buf, [codec])](#decoder)
 
<a name="CircularBuffer"></a>
#class: CircularBuffer
**Members**

* [class: CircularBuffer](#CircularBuffer)
  * [new CircularBuffer(initialSize)](#new_CircularBuffer)

<a name="new_CircularBuffer"></a>
##new CircularBuffer(initialSize)
Started this before I found cbarrick's version.  Keeping it around in case his doesn't work out.

**Params**

- initialSize   

<a name="Codec"></a>
#class: Codec
**Members**

* [class: Codec](#Codec)
  * [new Codec()](#new_Codec)
  * [codec._isInteger(n)](#Codec#_isInteger)
  * [codec._readFullValue(buf, [offset], [doNotConsume])](#Codec#_readFullValue)
  * [codec.decode(buf, [offset])](#Codec#decode)
  * [codec.encode(val, buf, [forceType])](#Codec#encode)

<a name="new_Codec"></a>
##new Codec()
Build a codec.

<a name="Codec#_isInteger"></a>
##codec._isInteger(n)
Acquired from http://stackoverflow.com/questions/3885817/how-to-check-if-a-number-is-float-or-integer

**Params**

- n `number` - Number to test.  

**Returns**: `boolean` - True if integral.  
**Access**: private  
<a name="Codec#_readFullValue"></a>
##codec._readFullValue(buf, [offset], [doNotConsume])
Reads a full value's worth of bytes from a circular or regular buffer, or returns undefined if not enough bytes are there.

**Params**

- buf `Buffer` | `CBuffer` - Buffer or circular buffer to read from.  If a Buffer is given, it is assumed to be full.  
- \[offset=0\] `integer` - Offset - only valid for Buffer, not CBuffer.  
- \[doNotConsume=false\] `boolean` - If set to true, will peek bytes instead of reading them - useful for leaving

**Returns**: `Array` - Buffer of full value + number of bytes read.
**Access**: private  
<a name="Codec#decode"></a>
##codec.decode(buf, [offset])
Decode a single entity from a buffer (starting at offset 0).  Only simple values currently supported.

**Params**

- buf `Buffer` | `CBuffer` - The buffer/circular buffer to decode.  Will decode a single value per call.  
- \[offset=0\] `integer` - The offset to read from (only used for Buffers).  

**Returns**: `Array` - Single decoded value + number of bytes consumed.  
<a name="Codec#encode"></a>
##codec.encode(val, buf, [forceType])
Encode the given value as an AMQP 1.0 bitstring.
 They are DescribedTypes, in which case they will be encoded as such.
 They contain an encodeOrdering array, in which case they will be encoded as a <code>list</code> of their values
 They are Int64s, in which case they will be encoded as <code>longs</code>.

**Params**

- val  - Value to encode.  
- buf `builder` - buffer-builder to write into.  
- \[forceType\] `string` - If set, forces the encoder for the given type.  

<a name="Connection"></a>
#class: Connection
**Members**

* [class: Connection](#Connection)
  * [new Connection()](#new_Connection)

<a name="new_Connection"></a>
##new Connection()
Connection states, from AMQP 1.0 spec:
 <dl>
 <dt>START</dt>
 <dd><p>In this state a Connection exists, but nothing has been sent or received. This is the
 state an implementation would be in immediately after performing a socket connect or
 socket accept.</p></dd>

 <dt>HDR_RCVD</dt>
 <dd><p>In this state the Connection header has been received from our peer, but we have not
 yet sent anything.</p></dd>

 <dt>HDR_SENT</dt>
 <dd><p>In this state the Connection header has been sent to our peer, but we have not yet
 received anything.</p></dd>

 <dt>OPEN_PIPE</dt>
 <dd><p>In this state we have sent both the Connection header and the open frame, but we have not yet received anything.
 </p></dd>

 <dt>OC_PIPE</dt>
 <dd><p>In this state we have sent the Connection header, the open
 frame, any pipelined Connection traffic, and the close frame,
 but we have not yet received anything.</p></dd>

 <dt>OPEN_RCVD</dt>
 <dd><p>In this state we have sent and received the Connection header, and received an
 open frame from our peer, but have not yet sent an
 open frame.</p></dd>

 <dt>OPEN_SENT</dt>
 <dd><p>In this state we have sent and received the Connection header, and sent an
 open frame to our peer, but have not yet received an
 open frame.</p></dd>

 <dt>CLOSE_PIPE</dt>
 <dd><p>In this state we have send and received the Connection header, sent an
 open frame, any pipelined Connection traffic, and the
 close frame, but we have not yet received an
 open frame.</p></dd>

 <dt>OPENED</dt>
 <dd><p>In this state the Connection header and the open frame
 have both been sent and received.</p></dd>

 <dt>CLOSE_RCVD</dt>
 <dd><p>In this state we have received a close frame indicating
 that our partner has initiated a close. This means we will never have to read anything
 more from this Connection, however we can continue to write frames onto the Connection.
 If desired, an implementation could do a TCP half-close at this point to shutdown the
 read side of the Connection.</p></dd>

 <dt>CLOSE_SENT</dt>
 <dd><p>In this state we have sent a close frame to our partner.
 It is illegal to write anything more onto the Connection, however there may still be
 incoming frames. If desired, an implementation could do a TCP half-close at this point
 to shutdown the write side of the Connection.</p></dd>

 <dt>DISCARDING</dt>
 <dd><p>The DISCARDING state is a variant of the CLOSE_SENT state where the
 close is triggered by an error. In this case any incoming frames on
 the connection MUST be silently discarded until the peer's close frame
 is received.</p></dd>

 <dt>END</dt>
 <dd><p>In this state it is illegal for either endpoint to write anything more onto the
 Connection. The Connection may be safely closed and discarded.</p></dd>
 </dl>
 <pre>
              R:HDR +=======+ S:HDR             R:HDR[!=S:HDR]
           +--------| START |-----+    +--------------------------------+
           |        +=======+     |    |                                |
          \|/                    \|/   |                                |
      +==========+             +==========+ S:OPEN                      |
 +----| HDR-RCVD |             | HDR-SENT |------+                      |
 |    +==========+             +==========+      |      R:HDR[!=S:HDR]  |
 |   S:HDR |                      | R:HDR        |    +-----------------+
 |         +--------+      +------+              |    |                 |
 |                 \|/    \|/                   \|/   |                 |
 |                +==========+               +-----------+ S:CLOSE      |
 |                | HDR-EXCH |               | OPEN-PIPE |----+         |
 |                +==========+               +-----------+    |         |
 |           R:OPEN |      | S:OPEN              | R:HDR      |         |
 |         +--------+      +------+      +-------+            |         |
 |        \|/                    \|/    \|/                  \|/        |
 |   +===========+             +===========+ S:CLOSE       +---------+  |
 |   | OPEN-RCVD |             | OPEN-SENT |-----+         | OC-PIPE |--+
 |   +===========+             +===========+     |         +---------+  |
 |  S:OPEN |                      | R:OPEN      \|/           | R:HDR   |
 |         |       +========+     |          +------------+   |         |
 |         +----- >| OPENED |< ---+          | CLOSE-PIPE |< -+         |
 |                 +========+                +------------+             |
 |           R:CLOSE |    | S:CLOSE              | R:OPEN               |
 |         +---------+    +-------+              |                      |
 |        \|/                    \|/             |                      |
 |   +============+          +=============+     |                      |
 |   | CLOSE-RCVD |          | CLOSE-SENT* |< ---+                      |
 |   +============+          +=============+                            |
 | S:CLOSE |                      | R:CLOSE                             |
 |         |         +=====+      |                                     |
 |         +------- >| END |< ----+                                     |
 |                   +=====+                                            |
 |                     /|\                                              |
 |    S:HDR[!=R:HDR]    |                R:HDR[!=S:HDR]                 |
 +----------------------+-----------------------------------------------+

 </pre>

<a name="DescribedType"></a>
#class: DescribedType
**Members**

* [class: DescribedType](#DescribedType)
  * [new DescribedType(descriptor, value)](#new_DescribedType)

<a name="new_DescribedType"></a>
##new DescribedType(descriptor, value)
Described type, as described in the AMQP 1.0 spec as follows:
<pre>
             constructor                       untyped bytes
                  |                                 |
      +-----------+-----------+   +-----------------+-----------------+
      |                       |   |                                   |
 ...  0x00 0xA1 0x03 "URL" 0xA1   0x1E "http://example.org/hello-world"  ...
           |             |  |     |                                   |
           +------+------+  |     |                                   |
                  |         |     |                                   |
             descriptor     |     +------------------+----------------+
                            |                        |
                            |         string value encoded according
                            |             to the str8-utf8 encoding
                            |
                 primitive format code
               for the str8-utf8 encoding

</pre>

**Params**

- descriptor  - Descriptor for the type (can be any valid AMQP type, including another described type).  
- value  - Value of the described type (can also be any valid AMQP type, including another described type).  

<a name="AttachFrame"></a>
#class: AttachFrame
**Members**

* [class: AttachFrame](#AttachFrame)
  * [new AttachFrame()](#new_AttachFrame)

<a name="new_AttachFrame"></a>
##new AttachFrame()
<h2>attach performative</h2>

<a name="BeginFrame"></a>
#class: BeginFrame
**Members**

* [class: BeginFrame](#BeginFrame)
  * [new BeginFrame()](#new_BeginFrame)

<a name="new_BeginFrame"></a>
##new BeginFrame()
<h2>begin performative</h2>

<a name="CloseFrame"></a>
#class: CloseFrame
**Members**

* [class: CloseFrame](#CloseFrame)
  * [new CloseFrame()](#new_CloseFrame)

<a name="new_CloseFrame"></a>
##new CloseFrame()
<h2>close performative</h2>

<a name="DetachFrame"></a>
#class: DetachFrame
**Members**

* [class: DetachFrame](#DetachFrame)
  * [new DetachFrame()](#new_DetachFrame)

<a name="new_DetachFrame"></a>
##new DetachFrame()
<h2>detach performative</h2>

<a name="DispositionFrame"></a>
#class: DispositionFrame
**Members**

* [class: DispositionFrame](#DispositionFrame)
  * [new DispositionFrame()](#new_DispositionFrame)

<a name="new_DispositionFrame"></a>
##new DispositionFrame()
<h2>disposition performative</h2>

<a name="EndFrame"></a>
#class: EndFrame
**Members**

* [class: EndFrame](#EndFrame)
  * [new EndFrame()](#new_EndFrame)

<a name="new_EndFrame"></a>
##new EndFrame()
<h2>end performative</h2>

<a name="FlowFrame"></a>
#class: FlowFrame
**Members**

* [class: FlowFrame](#FlowFrame)
  * [new FlowFrame()](#new_FlowFrame)

<a name="new_FlowFrame"></a>
##new FlowFrame()
<h2>flow performative</h2>

<a name="Frame"></a>
#class: Frame
**Members**

* [class: Frame](#Frame)
  * [new Frame()](#new_Frame)
  * [frame.outgoing()](#Frame#outgoing)
  * [frame.readPerformative(describedType)](#Frame#readPerformative)

<a name="new_Frame"></a>
##new Frame()
Encapsulates all convenience methods required for encoding a frame to put it out on the wire, and decoding an
 <pre>
             +0       +1       +2       +3
        +-----------------------------------+ -.
      0 |                SIZE               |  |
        +-----------------------------------+  |-- > Frame Header
      4 |  DOFF  |  TYPE  | &lt;TYPE-SPECIFIC&gt; |  |      (8 bytes)
        +-----------------------------------+ -'
        +-----------------------------------+ -.
      8 |                ...                |  |
        .                                   .  |-- > Extended Header
        .          &lt;TYPE-SPECIFIC&gt;          .  |  (DOFF * 4 - 8) bytes
        |                ...                |  |
        +-----------------------------------+ -'
        +-----------------------------------+ -.
 4*DOFF |                                   |  |
        .                                   .  |
        .                                   .  |
        .                                   .  |
        .          &lt;TYPE-SPECIFIC&gt;          .  |-- > Frame Body
        .                                   .  |  (SIZE - DOFF * 4) bytes
        .                                   .  |
        .                                   .  |
        .                           ________|  |
        |                ...       |           |
        +--------------------------+          -'

 </pre>

<a name="Frame#outgoing"></a>
##frame.outgoing()
Populate the internal buffer with contents built based on the options.  SIZE and DOFF will be inferred

**Access**: private  
<a name="Frame#readPerformative"></a>
##frame.readPerformative(describedType)
Used to populate the frame performative from a DescribedType pulled off the wire.

**Params**

- describedType <code>[DescribedType](#DescribedType)</code> - Details of the frame performative, should populate internal values.  

<a name="AMQPFrame"></a>
#class: AMQPFrame
**Members**

* [class: AMQPFrame](#AMQPFrame)
  * [new AMQPFrame()](#new_AMQPFrame)
  * [aMQPFrame._getPerformative()](#AMQPFrame#_getPerformative)
  * [aMQPFrame._getAdditionalPayload()](#AMQPFrame#_getAdditionalPayload)

<a name="new_AMQPFrame"></a>
##new AMQPFrame()
AMQP Frames are slight variations on the one above, with the first part of the payload taken up
<pre>
      +0       +1       +2       +3
        +-----------------------------------+ -.
      0 |                SIZE               |  |
        +-----------------------------------+  |-- > Frame Header
      4 |  DOFF  |  TYPE  |     CHANNEL     |  |      (8 bytes)
        +-----------------------------------+ -'
        +-----------------------------------+ -.
      8 |                ...                |  |
        .                                   .  |-- > Extended Header
        .             &lt;IGNORED&gt;             .  |  (DOFF * 4 - 8) bytes
        |                ...                |  |
        +-----------------------------------+ -'
        +-----------------------------------+ -.
 4*DOFF |           PERFORMATIVE:           |  |
        .      Open / Begin / Attach        .  |
        .   Flow / Transfer / Disposition   .  |
        .      Detach / End / Close         .  |
        |-----------------------------------|  |
        .                                   .  |-- > Frame Body
        .                                   .  |  (SIZE - DOFF * 4) bytes
        .             PAYLOAD               .  |
        .                                   .  |
        .                           ________|  |
        |                ...       |           |
        +--------------------------+          -'

</pre>

<a name="AMQPFrame#_getPerformative"></a>
##aMQPFrame._getPerformative()
Children should implement this method to translate their internal (friendly) representation into the

**Access**: private  
<a name="AMQPFrame#_getAdditionalPayload"></a>
##aMQPFrame._getAdditionalPayload()
AMQP Frames consist of two sections of payload - the performative, and the additional actual payload.

**Access**: private  
<a name="OpenFrame"></a>
#class: OpenFrame
**Members**

* [class: OpenFrame](#OpenFrame)
  * [new OpenFrame()](#new_OpenFrame)

<a name="new_OpenFrame"></a>
##new OpenFrame()
<h2>open performative</h2>

<a name="TransferFrame"></a>
#class: TransferFrame
**Members**

* [class: TransferFrame](#TransferFrame)
  * [new TransferFrame()](#new_TransferFrame)

<a name="new_TransferFrame"></a>
##new TransferFrame()
<h2>transfer performative</h2>

<a name="Types"></a>
#class: Types
**Members**

* [class: Types](#Types)
  * [new Types()](#new_Types)
  * [types._listBuilder()](#Types#_listBuilder)
  * [types._arrayBuilder()](#Types#_arrayBuilder)
  * [types._mapBuilder()](#Types#_mapBuilder)
  * [types._initTypesArray()](#Types#_initTypesArray)
  * [types._initEncodersDecoders()](#Types#_initEncodersDecoders)

<a name="new_Types"></a>
##new Types()
Type definitions, encoders, and decoders - used extensively by [Codec](#Codec).

<a name="Types#_listBuilder"></a>
##types._listBuilder()
Encoder for list types, specified in AMQP 1.0 as:
 <pre>
                       +----------= count items =----------+
                       |                                   |
   n OCTETs   n OCTETs |                                   |
 +----------+----------+--------------+------------+-------+
 |   size   |  count   |      ...    /|    item    |\ ...  |
 +----------+----------+------------/ +------------+ \-----+
                                   / /              \ \
                                  / /                \ \
                                 / /                  \ \
                                +-------------+----------+
                                | constructor |   data   |
                                +-------------+----------+

              Subcategory     n
              =================
              0xC             1
              0xD             4
 </pre>

**Access**: private  
<a name="Types#_arrayBuilder"></a>
##types._arrayBuilder()
All array encodings consist of a size followed by a count followed by an element constructor
 <pre>
                                             +--= count elements =--+
                                             |                      |
   n OCTETs   n OCTETs                       |                      |
 +----------+----------+---------------------+-------+------+-------+
 |   size   |  count   | element-constructor |  ...  | data |  ...  |
 +----------+----------+---------------------+-------+------+-------+

                         Subcategory     n
                         =================
                         0xE             1
                         0xF             4
 </pre>

**Access**: private  
<a name="Types#_mapBuilder"></a>
##types._mapBuilder()
A map is encoded as a compound value where the constituent elements form alternating key value pairs.
 <pre>
  item 0   item 1      item n-1    item n
 +-------+-------+----+---------+---------+
 | key 1 | val 1 | .. | key n/2 | val n/2 |
 +-------+-------+----+---------+---------+
 </pre>

**Access**: private  
<a name="Types#_initTypesArray"></a>
##types._initTypesArray()
Initialize list of all types.  Each contains a number of encodings, one of which contains an encoder method and all contain decoders.

**Access**: private  
<a name="Types#_initEncodersDecoders"></a>
##types._initEncodersDecoders()
Initialize all encoders and decoders based on type array.

**Access**: private  
<a name="encoder"></a>
#encoder(val, buf, [codec])
Encoder methods are used for all examples of that type and are expected to encode to the proper type (e.g. a uint will

**Params**

- val  - Value to encode (for fixed value encoders (e.g. null) this will be ignored)  
- buf `builder` - Buffer-builder into which to write code and encoded value  
- \[codec\] <code>[Codec](#Codec)</code> - If needed, the codec to encode other values (e.g. for lists/arrays)  

<a name="decoder"></a>
#decoder(buf, [codec])
Decoder methods decode an incoming buffer into an appropriate concrete JS entity.

**Params**

- buf `Buffer` - Buffer to decode, stripped of prefix code (e.g. 0xA1 0x03 'foo' would have the 0xA1 stripped)  
- \[codec\] <code>[Codec](#Codec)</code> - If needed, the codec to decode sub-values for composite types.  

**Returns**:  - Decoded value  